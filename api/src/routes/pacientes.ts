import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { conflito, naoEncontrado } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

const somenteDigitos = (v: string) => v.replace(/\D/g, '');

/** Valida CPF pelos dois dígitos verificadores (porte do ValidarCPF.cs original). */
function cpfValido(cpf: string): boolean {
  const d = somenteDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const [tamanho, posicao] of [
    [9, 10],
    [10, 11],
  ]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (posicao - i);
    const resto = (soma * 10) % 11;
    if ((resto === 10 ? 0 : resto) !== Number(d[tamanho])) return false;
  }
  return true;
}

const pacienteSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter ao menos 3 caracteres.').max(120),
  cpf: z
    .string()
    .trim()
    .transform(somenteDigitos)
    .refine((v) => v === '' || cpfValido(v), 'CPF inválido.')
    .transform((v) => v || null)
    .nullish(),
  rg: z.string().trim().max(20).nullish(),
  cartaoSus: z
    .string()
    .trim()
    .transform(somenteDigitos)
    .refine((v) => v === '' || v.length === 15, 'O Cartão SUS tem 15 dígitos.')
    .transform((v) => v || null)
    .nullish(),
  sexo: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']),
  dataNasc: z.coerce.date().refine((d) => d <= new Date(), 'Data de nascimento no futuro.'),
  nomeResponsavel: z.string().trim().max(120).nullish(),
  endereco: z.string().trim().min(3, 'Informe o endereço.').max(120),
  numero: z.string().trim().min(1, 'Informe o número.').max(10),
  bairro: z.string().trim().min(2, 'Informe o bairro.').max(80),
  cidade: z.string().trim().min(2, 'Informe a cidade.').max(80),
  estado: z.string().trim().length(2, 'UF deve ter 2 letras.').toUpperCase(),
  cep: z.string().trim().transform(somenteDigitos).nullish(),
  telefone1: z.string().trim().min(8, 'Informe um telefone.').max(20),
  telefone2: z.string().trim().max(20).nullish(),
  email: z.string().trim().email('E-mail inválido.').nullish().or(z.literal('').transform(() => null)),
  observacoes: z.string().trim().max(2000).nullish(),
});

const listaSchema = z.object({
  busca: z.string().trim().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
  incluirInativos: z.coerce.boolean().default(false),
});

export default async function pacientesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.autenticar);

  app.get('/', async (req) => {
    const { busca, pagina, porPagina, incluirInativos } = listaSchema.parse(req.query);

    const where = {
      ...(incluirInativos ? {} : { ativo: true }),
      ...(busca
        ? {
            OR: [
              { nome: { contains: busca, mode: 'insensitive' as const } },
              { cpf: { contains: somenteDigitos(busca) || '\u0000' } },
              { cartaoSus: { contains: somenteDigitos(busca) || '\u0000' } },
            ],
          }
        : {}),
    };

    const [total, itens] = await Promise.all([
      prisma.paciente.count({ where }),
      prisma.paciente.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ]);

    return { itens, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) || 1 };
  });

  app.get('/:id', async (req) => {
    const { id } = z.object({ id: z.coerce.number().int() }).parse(req.params);

    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        consultas: {
          orderBy: { dataHora: 'desc' },
          include: {
            especialidade: true,
            medico: { include: { funcionario: { select: { nome: true } } } },
          },
        },
      },
    });

    if (!paciente) throw naoEncontrado('Paciente');
    return paciente;
  });

  app.post('/', async (req, reply) => {
    const dados = pacienteSchema.parse(req.body);
    await garantirUnicidade(dados);
    const paciente = await prisma.paciente.create({ data: dados });
    reply.code(201);
    return paciente;
  });

  app.put('/:id', async (req) => {
    const { id } = z.object({ id: z.coerce.number().int() }).parse(req.params);
    const dados = pacienteSchema.parse(req.body);

    if (!(await prisma.paciente.findUnique({ where: { id } }))) throw naoEncontrado('Paciente');
    await garantirUnicidade(dados, id);

    return prisma.paciente.update({ where: { id }, data: dados });
  });

  // Desativa em vez de apagar: o histórico de consultas precisa continuar válido.
  app.delete('/:id', { onRequest: [app.exigirPapel('ADMIN')] }, async (req) => {
    const { id } = z.object({ id: z.coerce.number().int() }).parse(req.params);
    if (!(await prisma.paciente.findUnique({ where: { id } }))) throw naoEncontrado('Paciente');

    await prisma.paciente.update({ where: { id }, data: { ativo: false } });
    return { mensagem: 'Paciente desativado.' };
  });
}

async function garantirUnicidade(
  dados: { cpf?: string | null; cartaoSus?: string | null },
  ignorarId?: number,
) {
  for (const [campo, rotulo] of [
    ['cpf', 'CPF'],
    ['cartaoSus', 'Cartão SUS'],
  ] as const) {
    const valor = dados[campo];
    if (!valor) continue;
    const existente = await prisma.paciente.findUnique({ where: { [campo]: valor } as never });
    if (existente && existente.id !== ignorarId) {
      throw conflito(`Já existe um paciente cadastrado com este ${rotulo}.`);
    }
  }
}
