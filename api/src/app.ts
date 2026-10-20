import cors from '@fastify/cors';
import { Prisma } from '@prisma/client';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import './lib/zod-ptbr.js';
import { corsOrigins, env } from './lib/env.js';
import { HttpError } from './lib/http.js';
import { prisma } from './lib/prisma.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import consultasRoutes from './routes/consultas.js';
import especialidadesRoutes from './routes/especialidades.js';
import funcionariosRoutes from './routes/funcionarios.js';
import medicosRoutes from './routes/medicos.js';
import pacientesRoutes from './routes/pacientes.js';

/**
 * Para cada origem *.netlify.app liberada, aceita também os deploy previews
 * daquele site (`https://<hash>--<site>.netlify.app`), sem abrir o CORS
 * para qualquer subdomínio do netlify.app.
 */
const previewsNetlify = corsOrigins
  .map((origem) => /^https:\/\/([a-z0-9-]+)\.netlify\.app$/.exec(origem)?.[1])
  .filter((site): site is string => !!site)
  .map((site) => new RegExp(`^https://[a-z0-9-]+--${site}\\.netlify\\.app$`));

export async function criarApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      // Requisições sem Origin (curl, health check do Railway) passam.
      if (!origin) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      // Deploy previews do Netlify: https://<hash>--<site>.netlify.app
      if (previewsNetlify.some((re) => re.test(origin))) return cb(null, true);
      cb(new Error('Origem não autorizada pelo CORS.'), false);
    },
    credentials: true,
  });

  // Os handlers de erro vêm ANTES do registro das rotas: cada plugin filho
  // herda o handler vigente no momento em que é registrado, então definir
  // isso depois deixaria as rotas com o handler padrão do Fastify.
  app.setErrorHandler((erro, req, reply) => {
    if (erro instanceof ZodError) {
      return reply.code(400).send({
        erro: 'Dados inválidos.',
        campos: erro.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
      });
    }

    if (erro instanceof HttpError) {
      return reply.code(erro.status).send({ erro: erro.message, detalhes: erro.detalhes });
    }

    // Violação de unicidade que escapou das checagens explícitas.
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
      return reply.code(409).send({ erro: 'Já existe um registro com estes dados.' });
    }

    req.log.error({ erro }, 'Erro não tratado');
    return reply.code(500).send({ erro: 'Erro interno no servidor.' });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ erro: `Rota ${req.method} ${req.url} não existe.` });
  });

  await app.register(authPlugin);

  app.get('/health', async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, servico: 'smam-api', hora: new Date().toISOString() };
  });

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(pacientesRoutes, { prefix: '/pacientes' });
  await app.register(especialidadesRoutes, { prefix: '/especialidades' });
  await app.register(funcionariosRoutes, { prefix: '/funcionarios' });
  await app.register(medicosRoutes, { prefix: '/medicos' });
  await app.register(consultasRoutes, { prefix: '/consultas' });

  return app;
}
