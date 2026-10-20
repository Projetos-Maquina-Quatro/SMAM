import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

const ESPECIALIDADES = [
  'Clínica Geral',
  'Pediatria',
  'Ginecologia e Obstetrícia',
  'Cardiologia',
  'Dermatologia',
  'Odontologia',
  'Enfermagem',
  'Nutrição',
  'Psicologia',
  'Fisioterapia',
];

async function main() {
  console.log('Populando o banco do SMAM...');

  for (const nome of ESPECIALIDADES) {
    await prisma.especialidade.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }
  console.log(`  ${ESPECIALIDADES.length} especialidades garantidas.`);

  const senhaAdmin = process.env.SEED_ADMIN_SENHA ?? 'smam@2026';

  const funcionarioAdmin = await prisma.funcionario.upsert({
    where: { cpf: '00000000191' },
    update: {},
    create: {
      nome: 'Administrador do Sistema',
      cpf: '00000000191',
      sexo: 'OUTRO',
      dataNasc: new Date('1990-01-01'),
      cargo: 'Administrador',
      endereco: 'Rua da Prefeitura',
      numero: '1',
      bairro: 'Centro',
      cidade: 'Francisco Morato',
      estado: 'SP',
      telefone1: '1100000000',
    },
  });

  await prisma.usuario.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      login: 'admin',
      senhaHash: await bcrypt.hash(senhaAdmin, 10),
      papel: 'ADMIN',
      funcionarioId: funcionarioAdmin.id,
    },
  });

  console.log('\n  Acesso inicial criado:');
  console.log('    usuário: admin');
  console.log(`    senha:   ${senhaAdmin}`);
  console.log('\n  Troque esta senha no primeiro login.\n');
}

main()
  .catch((e) => {
    console.error('Falha ao popular o banco:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
