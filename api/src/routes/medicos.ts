import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { conflito, naoEncontrado } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

const idSchema = z.object({ id: z.coerce.number().int() });

const medicoSchema = z.object({
  crm: z
    .string()
    .trim()
    .min(4, 'Informe o CRM.')
    .max(20)
    .transform((v) => v.toUpperCase()),
  funcionarioId: z.coerce.number().int(),
  especialidadeId: z.coerce.number().int(),
});

export default async function medicosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.autenticar);

  app.get('/', async (req) => {
    const { especialidadeId, incluirInativos } = z
      .object({
        especialidadeId: z.coerce.number().int().optional(),
        incluirInativos: z.coerce.boolean().default(false),
      })
      .parse(req.query);

    const medicos = await prisma.medico.findMany({
      where: {
        ...(incluirInativos ? {} : { ativo: true }),
        ...(especialidadeId ? { especialidadeId } : {}),
      },
      include: {
        especialidade: true,
        funcionario: { select: { id: true, nome: true, email: true, telefone1: true } },
      },
      orderBy: { funcionario: { nome: 'asc' } },
    });

    return medicos.map((m) => ({
      id: m.id,
      crm: m.crm,
      ativo: m.ativo,
      nome: m.funcionario.nome,
      funcionarioId: m.funcionarioId,
      especialidade: m.especialidade,
      especialidadeId: m.especialidadeId,
      contato: { email: m.funcionario.email, telefone: m.funcionario.telefone1 },
    }));
  });

  app.post('/', { onRequest: [app.exigirPapel('ADMIN')] }, async (req, reply) => {
    const dados = medicoSchema.parse(req.body);

    const funcionario = await prisma.funcionario.findUnique({
      where: { id: dados.funcionarioId },
      include: { medico: true },
    });
    if (!funcionario) throw naoEncontrado('Funcionário');
    if (funcionario.medico) throw conflito('Este funcionário já está cadastrado como médico.');

    if (!(await prisma.especialidade.findUnique({ where: { id: dados.especialidadeId } }))) {
      throw naoEncontrado('Especialidade');
    }
    if (await prisma.medico.findUnique({ where: { crm: dados.crm } })) {
      throw conflito('Já existe um médico cadastrado com este CRM.');
    }

    reply.code(201);
    return prisma.medico.create({
      data: dados,
      include: { especialidade: true, funcionario: { select: { nome: true } } },
    });
  });

  app.put('/:id', { onRequest: [app.exigirPapel('ADMIN')] }, async (req) => {
    const { id } = idSchema.parse(req.params);
    const dados = medicoSchema.parse(req.body);

    if (!(await prisma.medico.findUnique({ where: { id } }))) throw naoEncontrado('Médico');
    const homonimo = await prisma.medico.findUnique({ where: { crm: dados.crm } });
    if (homonimo && homonimo.id !== id) {
      throw conflito('Já existe um médico cadastrado com este CRM.');
    }

    return prisma.medico.update({
      where: { id },
      data: dados,
      include: { especialidade: true, funcionario: { select: { nome: true } } },
    });
  });

  app.delete('/:id', { onRequest: [app.exigirPapel('ADMIN')] }, async (req) => {
    const { id } = idSchema.parse(req.params);

    const medico = await prisma.medico.findUnique({
      where: { id },
      include: {
        _count: { select: { consultas: { where: { status: 'AGENDADA' } } } },
      },
    });
    if (!medico) throw naoEncontrado('Médico');

    if (medico._count.consultas > 0) {
      throw conflito(
        `Este médico tem ${medico._count.consultas} consulta(s) agendada(s). Cancele ou remarque antes de desativá-lo.`,
      );
    }

    await prisma.medico.update({ where: { id }, data: { ativo: false } });
    return { mensagem: 'Médico desativado.' };
  });
}
