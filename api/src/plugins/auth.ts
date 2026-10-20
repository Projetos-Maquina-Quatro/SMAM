import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../lib/env.js';
import { HttpError } from '../lib/http.js';

export type Papel = 'ADMIN' | 'ATENDENTE' | 'MEDICO';

export interface TokenPayload {
  sub: number;
  login: string;
  nome: string;
  papel: Papel;
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Exige um token válido. Use em `onRequest`. */
    autenticar: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Exige um token válido e um dos papéis informados. */
    exigirPapel: (
      ...papeis: Papel[]
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '8h' },
  });

  app.decorate('autenticar', async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
    } catch {
      throw new HttpError(401, 'Sessão expirada ou token inválido. Faça login novamente.');
    }
  });

  app.decorate('exigirPapel', (...papeis: Papel[]) => {
    return async (req: FastifyRequest) => {
      try {
        await req.jwtVerify();
      } catch {
        throw new HttpError(401, 'Sessão expirada ou token inválido. Faça login novamente.');
      }
      if (!papeis.includes(req.user.papel)) {
        throw new HttpError(403, 'Seu perfil não tem permissão para esta operação.');
      }
    };
  });
});
