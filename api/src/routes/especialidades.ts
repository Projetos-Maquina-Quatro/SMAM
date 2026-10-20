import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { conflito, naoEncontrado } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

const corpoSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome da especialidade.').max(100),
});

const idSchema = z.object({ id: z.coerce.number().int() });

export default async function especialidadesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.autenticar);

  app.get('/', async (req) => {
    const { incluirInativas } = z
      .object({ incluirInativas: z.coerce.boolean().default(false) })
      .parse(req.query);

    return prisma.especialidade.findMany({
      where: incluirInativas ? {} : { ativo: true },
      orderBy: { nome: 'asc' },
      include: { _count: { select: { medicos: true } } },
    });
  });

  app.post('/', { onRequest: [app.exigirPapel('ADMIN', 'ATENDENTE')] }, async (req, reply) => {
    const { nome } = corpoSchema.parse(req.body);

    if (await prisma.especialidade.findUnique({ where: { nome } })) {
      throw conflito('Já existe uma especialidade com este nome.');
    }

    reply.code(201);
    return prisma.especialidade.create({ data: { nome } });
  });

  app.put('/:id', { onRequest: [app.exigirPapel('ADMIN', 'ATENDENTE')] }, async (req) => {
    const { id } = idSchema.parse(req.params);
    const { nome } = corpoSchema.parse(req.body);

    if (!(await prisma.especialidade.findUnique({ where: { id } }))) {
      throw naoEncontrado('Especialidade');
    }
    const homonima = await prisma.especialidade.findUnique({ where: { nome } });
    if (homonima && homonima.id !== id) {
      throw conflito('Já existe uma especialidade com este nome.');
    }

    return prisma.especialidade.update({ where: { id }, data: { nome } });
  });

  app.delete('/:id', { onRequest: [app.exigirPapel('ADMIN')] }, async (req) => {
    const { id } = idSchema.parse(req.params);

    const especialidade = await prisma.especialidade.findUnique({
      where: { id },
      include: { _count: { select: { medicos: true, consultas: true } } },
    });
    if (!especialidade) throw naoEncontrado('Especialidade');

    if (especialidade._count.medicos > 0) {
      throw conflito(
        `Esta especialidade tem ${especialidade._count.medicos} médico(s) vinculado(s). Remova os vínculos antes de desativá-la.`,
      );
    }

    await prisma.especialidade.update({ where: { id }, data: { ativo: false } });
    return { mensagem: 'Especialidade desativada.' };
  });
}
