import { criarApp } from './app.js';
import { env } from './lib/env.js';
import { prisma } from './lib/prisma.js';

const app = await criarApp();

// O Railway injeta PORT e exige bind em 0.0.0.0 para o container ser alcançável.
await app.listen({ port: env.PORT, host: '0.0.0.0' });

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, async () => {
    app.log.info(`${sinal} recebido, encerrando...`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}
