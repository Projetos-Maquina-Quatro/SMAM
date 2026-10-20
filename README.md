# SMAM — Sistema Municipal de Atendimento Médico

Recriação em web do SMAM, originalmente desenvolvido como Trabalho de Conclusão de Curso
do Técnico em Informática na **ETEC de Francisco Morato (Centro Paula Souza), 2013**.

O sistema original era um aplicativo Windows Forms em C# com SQL Server local e instalador.
Esta versão roda no navegador, sem instalação: frontend estático no **Netlify** e API com
banco PostgreSQL no **Railway**.

## Arquitetura

```
smam-web/
├── api/                      API REST  →  Railway
│   ├── prisma/
│   │   ├── schema.prisma     modelo de dados (derivado do BD_UBS.sql de 2013)
│   │   └── seed.ts           admin inicial + especialidades
│   └── src/
│       ├── routes/           auth, pacientes, especialidades, funcionarios, medicos, consultas
│       ├── plugins/auth.ts   JWT e controle de papéis
│       ├── lib/              Prisma, env validado, erros HTTP
│       ├── app.ts            registro de rotas, CORS, tratamento de erros
│       └── server.ts         bootstrap
└── web/                      Interface  →  Netlify
    └── src/
        ├── pages/            Login, Painel, Pacientes, Médicos, Especialidades,
        │                     Funcionários, Agenda, Marcar consulta
        ├── components/       Layout (menu lateral) e biblioteca de UI
        └── lib/              cliente da API, autenticação, formatação pt-BR
```

| Camada  | Tecnologia                                                |
| ------- | --------------------------------------------------------- |
| API     | Node 22, Fastify 5, Prisma 6, PostgreSQL, JWT, Zod         |
| Web     | React 19, TypeScript, Vite 6, Tailwind 4, TanStack Query 5 |
| Deploy  | Railway (API + Postgres), Netlify (frontend)               |

## O que já funciona

- **Login com JWT** e três perfis: Administrador, Atendente e Médico
- **Pacientes** — cadastro completo com validação de CPF, Cartão SUS, busca paginada e
  histórico de consultas; desativação em vez de exclusão, para não quebrar o histórico
- **Especialidades** e **Médicos** (CRM vinculado a um funcionário e a uma especialidade)
- **Funcionários** com criação opcional de credencial de acesso (só Administrador)
- **Marcar consulta** em três etapas, com horários livres calculados de 30 em 30 minutos
  no horário de funcionamento da UBS e bloqueio de conflito por médico
- **Agenda do dia** com navegação por data, filtros e registro de atendida / faltou / cancelada
- **Painel** com os números do dia e os próximos atendimentos

## Rodando localmente

Pré-requisito: Node 20 ou superior. Não é necessário instalar PostgreSQL — usamos
o banco do Railway também em desenvolvimento.

### 1. Banco no Railway

1. Crie uma conta em [railway.app](https://railway.app) e um novo projeto
2. **New → Database → Add PostgreSQL**
3. No serviço Postgres, aba **Variables**, copie o valor de `DATABASE_PUBLIC_URL`
   (a pública, não a interna — você vai acessar de fora do Railway)

### 2. API

```bash
cd api
cp .env.example .env
```

Edite `.env`:

```ini
DATABASE_URL="postgresql://...DATABASE_PUBLIC_URL copiada do Railway..."
JWT_SECRET="cole aqui um valor aleatorio longo"
CORS_ORIGINS="http://localhost:5173"
PORT=3333
```

Gere um `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Crie as tabelas, popule e suba:

```bash
npm install
npm run db:migrate -- --name inicial   # cria as tabelas
npm run seed                           # admin + especialidades
npm run dev                            # http://localhost:3333
```

O seed imprime as credenciais iniciais (`admin` / `smam@2026`). Troque a senha no
primeiro login.

### 3. Frontend

Em outro terminal:

```bash
cd web
cp .env.example .env
npm install
npm run dev     # http://localhost:5173
```

## Deploy

### API no Railway

1. Suba o repositório para o GitHub
2. No projeto do Railway: **New → GitHub Repo** e escolha este repositório
3. Em **Settings → Root Directory**, informe `api`
4. Em **Variables**, defina:

   | Variável       | Valor                                                         |
   | -------------- | ------------------------------------------------------------- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência ao serviço do banco) |
   | `JWT_SECRET`   | o mesmo segredo longo e aleatório                             |
   | `CORS_ORIGINS` | a URL do Netlify, ex. `https://smam.netlify.app`              |
   | `NODE_ENV`     | `production`                                                  |

   `PORT` é injetada pelo Railway — não defina.

5. Em **Settings → Networking**, clique em **Generate Domain** e guarde a URL
6. O `npm start` roda `prisma migrate deploy` antes de subir, então as tabelas são
   criadas no primeiro deploy. Rode o seed uma vez com a `DATABASE_PUBLIC_URL` no `.env`
   local: `npm run seed`

Confira o health check: `https://sua-api.up.railway.app/health`

### Frontend no Netlify

1. **Add new site → Import an existing project** e escolha o repositório
2. Configure:
   - **Base directory**: `web`
   - **Build command**: `npm run build`
   - **Publish directory**: `web/dist`
3. Em **Site configuration → Environment variables**, defina:

   | Variável       | Valor                                  |
   | -------------- | -------------------------------------- |
   | `VITE_API_URL` | `https://sua-api.up.railway.app`       |

4. Faça o deploy

> O `VITE_API_URL` é embutido no bundle em tempo de build. Se você mudar a URL da API
> depois, precisa disparar um novo deploy no Netlify (**Trigger deploy → Clear cache and
> deploy site**).

5. Volte ao Railway e coloque o domínio final do Netlify em `CORS_ORIGINS`

O `netlify.toml` já cuida do redirect de SPA (toda rota cai no `index.html`) e dos
cabeçalhos de segurança.

## Decisões em relação ao sistema de 2013

| Original                                         | Agora                                                      |
| ------------------------------------------------ | ---------------------------------------------------------- |
| Senha em texto puro na tabela `LOGINN`            | Hash bcrypt, e um login `admin`/`admin` fixo foi removido  |
| `DataNasc varchar(10)`                           | `DateTime` — permite ordenar e calcular idade              |
| `uq_DataHora` única na tabela `CONSULTA` inteira | Horário único **por médico**, que é a regra real           |
| `Prioridade` gravada mas nunca usada             | Ordena a fila e destaca urgências na agenda                |
| Exclusão física dos cadastros                    | Desativação (`ativo`), preservando o histórico             |
| `TipoUsuario` como texto livre                   | Enum `Papel` com permissão verificada em cada rota         |
| Instalador, .NET 4.0 e SQL Server na máquina     | Navegador, sem instalação                                  |

## Próximos passos

Fora do MVP, do escopo do TCC original, ainda faltam:

- Exames: cadastro e agendamento (tabelas `EXAME` e `EXAME2` do original)
- Agenda médica por profissional (dias e horários próprios, tabela `AGENDA`)
- Relatórios em PDF e declarações de comparecimento (eram `.rdlc` no ReportViewer)
- Avisos e calendário de eventos da unidade
- Tela de alteração de senha pelo próprio usuário (a rota `PATCH /auth/senha` já existe)

## Histórico

Autores do TCC original (2013): Alvaro de Oliveira Santos, Danilo Honorio de Oliveira,
Graziela Delmonte de Moura, Lucas Vinicius da Silva, Rafael da Silva Rodrigues e
Sinara dos Santos Teixeira. Orientador: Anderson Spera.
