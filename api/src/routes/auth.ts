import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import type { Papel } from '../plugins/auth.js';

const loginSchema = z.object({
  login: z.string().trim().min(1, 'Informe o usuário.'),
  senha: z.string().min(1, 'Informe a senha.'),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (req) => {
    const { login, senha } = loginSchema.parse(req.body);

    const usuario = await prisma.usuario.findUnique({
      where: { login },
      include: { funcionario: { select: { nome: true } } },
    });

    // Mensagem genérica de propósito: não revela se o usuário existe.
    const credenciaisInvalidas = new HttpError(401, 'Usuário ou senha incorretos.');

    if (!usuario || !usuario.ativo) throw credenciaisInvalidas;
    if (!(await bcrypt.compare(senha, usuario.senhaHash))) throw credenciaisInvalidas;

    const nome = usuario.funcionario?.nome ?? usuario.login;
    const token = app.jwt.sign({
      sub: usuario.id,
      login: usuario.login,
      nome,
      papel: usuario.papel as Papel,
    });

    return {
      token,
      usuario: { id: usuario.id, login: usuario.login, nome, papel: usuario.papel },
    };
  });

  app.get('/me', { onRequest: [app.autenticar] }, async (req) => {
    const { sub, login, nome, papel } = req.user;
    return { usuario: { id: sub, login, nome, papel } };
  });

  app.patch('/senha', { onRequest: [app.autenticar] }, async (req) => {
    const body = z
      .object({
        senhaAtual: z.string().min(1),
        novaSenha: z.string().min(6, 'A nova senha precisa ter ao menos 6 caracteres.'),
      })
      .parse(req.body);

    const usuario = await prisma.usuario.findUnique({ where: { id: req.user.sub } });
    if (!usuario) throw new HttpError(404, 'Usuário não encontrado.');
    if (!(await bcrypt.compare(body.senhaAtual, usuario.senhaHash))) {
      throw new HttpError(400, 'Senha atual incorreta.');
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash: await bcrypt.hash(body.novaSenha, 10) },
    });

    return { mensagem: 'Senha alterada com sucesso.' };
  });
}
