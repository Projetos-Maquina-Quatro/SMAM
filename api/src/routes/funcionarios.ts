import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { conflito, naoEncontrado } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

const somenteDigitos = (v: string) => v.replace(/\D/g, '');
const idSchema = z.object({ id: z.coerce.number().int() });

const funcionarioSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter ao menos 3 caracteres.').max(120),
  cpf: z
    .string()
    .trim()
    .transform(somenteDigitos)
    .refine((v) => v.length === 11, 'CPF deve ter 11 dígitos.'),
  rg: z.string().trim().max(20).nullish(),
  sexo: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']),
  dataNasc: z.coerce.date(),
  cargo: z.string().trim().min(2, 'Informe o cargo.').max(60),
  endereco: z.string().trim().min(3).max(120),
  numero: z.string().trim().min(1).max(10),
  bairro: z.string().trim().min(2).max(80),
  cidade: z.string().trim().min(2).max(80),
  estado: z.string().trim().length(2, 'UF deve ter 2 letras.').toUpperCase(),
  cep: z.string().trim().transform(somenteDigitos).nullish(),
  telefone1: z.string().trim().min(8, 'Informe um telefone.').max(20),
  telefone2: z.string().trim().max(20).nullish(),
  email: z.string().trim().email('E-mail inválido.').nullish().or(z.literal('').transform(() => null)),
  // Credencial de acesso opcional, criada junto com o funcionário.
  acesso: z
    .object({
      login: z.string().trim().min(3, 'O login precisa ter ao menos 3 caracteres.').max(30),
      senha: z.string().min(6, 'A senha precisa ter ao menos 6 caracteres.'),
      papel: z.enum(['ADMIN', 'ATENDENTE', 'MEDICO']),
    })
    .nullish(),
});

export default async function funcionariosRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.exigirPapel('ADMIN'));

  app.get('/', async (req) => {
    const { busca, incluirInativos } = z
      .object({
        busca: z.string().trim().optional(),
        incluirInativos: z.coerce.boolean().default(false),
      })
      .parse(req.query);

    return prisma.funcionario.findMany({
      where: {
        ...(incluirInativos ? {} : { ativo: true }),
        ...(busca ? { nome: { contains: busca, mode: 'insensitive' } } : {}),
      },
      orderBy: { nome: 'asc' },
      include: {
        usuario: { select: { id: true, login: true, papel: true, ativo: true } },
        medico: { include: { especialidade: true } },
      },
    });
  });

  app.get('/:id', async (req) => {
    const { id } = idSchema.parse(req.params);
    const funcionario = await prisma.funcionario.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, login: true, papel: true, ativo: true } },
        medico: { include: { especialidade: true } },
      },
    });
    if (!funcionario) throw naoEncontrado('Funcionário');
    return funcionario;
  });

  app.post('/', async (req, reply) => {
    const { acesso, ...dados } = funcionarioSchema.parse(req.body);

    if (await prisma.funcionario.findUnique({ where: { cpf: dados.cpf } })) {
      throw conflito('Já existe um funcionário cadastrado com este CPF.');
    }
    if (acesso && (await prisma.usuario.findUnique({ where: { login: acesso.login } }))) {
      throw conflito('Este login já está em uso.');
    }

    const funcionario = await prisma.funcionario.create({
      data: {
        ...dados,
        ...(acesso
          ? {
              usuario: {
                create: {
                  login: acesso.login,
                  senhaHash: await bcrypt.hash(acesso.senha, 10),
                  papel: acesso.papel,
                },
              },
            }
          : {}),
      },
      include: { usuario: { select: { id: true, login: true, papel: true } } },
    });

    reply.code(201);
    return funcionario;
  });

  app.put('/:id', async (req) => {
    const { id } = idSchema.parse(req.params);
    const { acesso: _acesso, ...dados } = funcionarioSchema.parse(req.body);

    if (!(await prisma.funcionario.findUnique({ where: { id } }))) {
      throw naoEncontrado('Funcionário');
    }
    const homonimo = await prisma.funcionario.findUnique({ where: { cpf: dados.cpf } });
    if (homonimo && homonimo.id !== id) {
      throw conflito('Já existe um funcionário cadastrado com este CPF.');
    }

    return prisma.funcionario.update({ where: { id }, data: dados });
  });

  app.delete('/:id', async (req) => {
    const { id } = idSchema.parse(req.params);
    const funcionario = await prisma.funcionario.findUnique({
      where: { id },
      include: { usuario: true },
    });
    if (!funcionario) throw naoEncontrado('Funcionário');

    if (funcionario.usuario?.id === req.user.sub) {
      throw conflito('Você não pode desativar o seu próprio cadastro.');
    }

    // Desativa o funcionário e revoga o acesso dele na mesma transação.
    await prisma.$transaction([
      prisma.funcionario.update({ where: { id }, data: { ativo: false } }),
      ...(funcionario.usuario
        ? [prisma.usuario.update({ where: { id: funcionario.usuario.id }, data: { ativo: false } })]
        : []),
    ]);

    return { mensagem: 'Funcionário desativado e acesso revogado.' };
  });
}
