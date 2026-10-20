import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError, conflito, naoEncontrado } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

/**
 * Horário de funcionamento da UBS. O original guardava isso na tabela AGENDA
 * por médico; no MVP é uma regra fixa igual para todos.
 * O Brasil não tem horário de verão desde 2019, então o offset é constante.
 */
const FUSO_UBS = '-03:00';
const ABERTURA = 8; // 08:00
const FECHAMENTO = 17; // último encaixe começa 16:30
const DURACAO_MINUTOS = 30;

const idSchema = z.object({ id: z.coerce.number().int() });
const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.');

const incluirRelacionados = {
  paciente: { select: { id: true, nome: true, cartaoSus: true, telefone1: true, dataNasc: true } },
  especialidade: true,
  medico: { select: { id: true, crm: true, funcionario: { select: { nome: true } } } },
} as const;

const consultaSchema = z.object({
  pacienteId: z.coerce.number().int(),
  medicoId: z.coerce.number().int(),
  dataHora: z.coerce.date(),
  prioridade: z.enum(['NORMAL', 'PREFERENCIAL', 'URGENTE']).default('NORMAL'),
  observacoes: z.string().trim().max(2000).nullish(),
});

/** Monta todos os horários atendíveis de um dia, no fuso da UBS. */
function gradeDoDia(data: string): Date[] {
  const slots: Date[] = [];
  for (let hora = ABERTURA; hora < FECHAMENTO; hora++) {
    for (let minuto = 0; minuto < 60; minuto += DURACAO_MINUTOS) {
      const hh = String(hora).padStart(2, '0');
      const mm = String(minuto).padStart(2, '0');
      slots.push(new Date(`${data}T${hh}:${mm}:00${FUSO_UBS}`));
    }
  }
  return slots;
}

function intervaloDoDia(data: string) {
  return {
    inicio: new Date(`${data}T00:00:00${FUSO_UBS}`),
    fim: new Date(`${data}T23:59:59${FUSO_UBS}`),
  };
}

export default async function consultasRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.autenticar);

  /** Agenda do dia (tela "Consultas" do original). */
  app.get('/', async (req) => {
    const { data, medicoId, especialidadeId, pacienteId, status } = z
      .object({
        data: dataSchema.optional(),
        medicoId: z.coerce.number().int().optional(),
        especialidadeId: z.coerce.number().int().optional(),
        pacienteId: z.coerce.number().int().optional(),
        status: z.enum(['AGENDADA', 'CONCLUIDA', 'CANCELADA', 'FALTOU']).optional(),
      })
      .parse(req.query);

    const periodo = data ? intervaloDoDia(data) : null;

    return prisma.consulta.findMany({
      where: {
        ...(periodo ? { dataHora: { gte: periodo.inicio, lte: periodo.fim } } : {}),
        ...(medicoId ? { medicoId } : {}),
        ...(especialidadeId ? { especialidadeId } : {}),
        ...(pacienteId ? { pacienteId } : {}),
        ...(status ? { status } : {}),
      },
      include: incluirRelacionados,
      // Urgente primeiro no mesmo horário: é a triagem que o campo Prioridade
      // do banco de 2013 já previa, mas que o software não usava.
      orderBy: [{ dataHora: 'asc' }, { prioridade: 'desc' }],
    });
  });

  /** Horários ainda livres de um médico em um dia. */
  app.get('/horarios-livres', async (req) => {
    const { medicoId, data } = z
      .object({ medicoId: z.coerce.number().int(), data: dataSchema })
      .parse(req.query);

    if (!(await prisma.medico.findUnique({ where: { id: medicoId } }))) {
      throw naoEncontrado('Médico');
    }

    const periodo = intervaloDoDia(data);
    const ocupados = await prisma.consulta.findMany({
      where: {
        medicoId,
        status: { not: 'CANCELADA' },
        dataHora: { gte: periodo.inicio, lte: periodo.fim },
      },
      select: { dataHora: true },
    });

    const ocupadosEm = new Set(ocupados.map((c) => c.dataHora.getTime()));
    const agora = Date.now();

    return gradeDoDia(data)
      .filter((slot) => !ocupadosEm.has(slot.getTime()) && slot.getTime() > agora)
      .map((slot) => slot.toISOString());
  });

  /** Números do dia para o painel inicial. */
  app.get('/resumo', async (req) => {
    const { data } = z.object({ data: dataSchema }).parse(req.query);
    const periodo = intervaloDoDia(data);
    const noDia = { dataHora: { gte: periodo.inicio, lte: periodo.fim } };

    const [agendadas, concluidas, canceladas, urgentes, pacientesAtivos] = await Promise.all([
      prisma.consulta.count({ where: { ...noDia, status: 'AGENDADA' } }),
      prisma.consulta.count({ where: { ...noDia, status: 'CONCLUIDA' } }),
      prisma.consulta.count({ where: { ...noDia, status: 'CANCELADA' } }),
      prisma.consulta.count({ where: { ...noDia, status: 'AGENDADA', prioridade: 'URGENTE' } }),
      prisma.paciente.count({ where: { ativo: true } }),
    ]);

    return { data, agendadas, concluidas, canceladas, urgentes, pacientesAtivos };
  });

  app.get('/:id', async (req) => {
    const { id } = idSchema.parse(req.params);
    const consulta = await prisma.consulta.findUnique({ where: { id }, include: incluirRelacionados });
    if (!consulta) throw naoEncontrado('Consulta');
    return consulta;
  });

  app.post('/', async (req, reply) => {
    const dados = consultaSchema.parse(req.body);

    const paciente = await prisma.paciente.findUnique({ where: { id: dados.pacienteId } });
    if (!paciente || !paciente.ativo) throw naoEncontrado('Paciente');

    const medico = await prisma.medico.findUnique({ where: { id: dados.medicoId } });
    if (!medico || !medico.ativo) throw naoEncontrado('Médico');

    if (dados.dataHora.getTime() < Date.now()) {
      throw new HttpError(400, 'Não é possível agendar uma consulta no passado.');
    }

    const jaOcupado = await prisma.consulta.findFirst({
      where: {
        medicoId: dados.medicoId,
        dataHora: dados.dataHora,
        status: { not: 'CANCELADA' },
      },
    });
    if (jaOcupado) throw conflito('Este médico já tem uma consulta marcada neste horário.');

    const mesmoPaciente = await prisma.consulta.findFirst({
      where: {
        pacienteId: dados.pacienteId,
        dataHora: dados.dataHora,
        status: { not: 'CANCELADA' },
      },
    });
    if (mesmoPaciente) {
      throw conflito('Este paciente já tem outra consulta marcada neste mesmo horário.');
    }

    reply.code(201);
    return prisma.consulta.create({
      data: { ...dados, especialidadeId: medico.especialidadeId },
      include: incluirRelacionados,
    });
  });

  /** Remarcar: muda horário e/ou médico mantendo o histórico do registro. */
  app.put('/:id', async (req) => {
    const { id } = idSchema.parse(req.params);
    const dados = consultaSchema.parse(req.body);

    const consulta = await prisma.consulta.findUnique({ where: { id } });
    if (!consulta) throw naoEncontrado('Consulta');
    if (consulta.status !== 'AGENDADA') {
      throw conflito('Só é possível remarcar consultas com status AGENDADA.');
    }

    const medico = await prisma.medico.findUnique({ where: { id: dados.medicoId } });
    if (!medico || !medico.ativo) throw naoEncontrado('Médico');

    const jaOcupado = await prisma.consulta.findFirst({
      where: {
        medicoId: dados.medicoId,
        dataHora: dados.dataHora,
        status: { not: 'CANCELADA' },
        id: { not: id },
      },
    });
    if (jaOcupado) throw conflito('Este médico já tem uma consulta marcada neste horário.');

    return prisma.consulta.update({
      where: { id },
      data: { ...dados, especialidadeId: medico.especialidadeId },
      include: incluirRelacionados,
    });
  });

  /** "Checar consulta" do original: conclui, cancela ou marca falta. */
  app.patch('/:id/status', async (req) => {
    const { id } = idSchema.parse(req.params);
    const { status, observacoes } = z
      .object({
        status: z.enum(['AGENDADA', 'CONCLUIDA', 'CANCELADA', 'FALTOU']),
        observacoes: z.string().trim().max(2000).nullish(),
      })
      .parse(req.body);

    const consulta = await prisma.consulta.findUnique({ where: { id } });
    if (!consulta) throw naoEncontrado('Consulta');

    if (consulta.status === 'CONCLUIDA' && status !== 'CONCLUIDA') {
      throw conflito('Uma consulta já concluída não pode ter o status alterado.');
    }

    return prisma.consulta.update({
      where: { id },
      data: { status, ...(observacoes !== undefined ? { observacoes } : {}) },
      include: incluirRelacionados,
    });
  });
}
