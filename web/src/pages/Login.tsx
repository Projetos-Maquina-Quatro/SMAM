import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Alerta, Botao, Campo } from '../components/ui';

export default function Login() {
  const { usuario, entrar, carregando } = useAuth();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (carregando) return null;
  if (usuario) return <Navigate to="/" replace />;

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(login, senha);
    } catch (e) {
      setErro(
        e instanceof ApiError ? e.message : 'Não foi possível entrar. Tente novamente.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Painel de apresentação */}
      <div className="hidden flex-col justify-between bg-smam-900 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-smam-500 text-white">
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
              <path
                d="M12 4v16M4 12h16"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold text-white">SMAM</p>
            <p className="text-xs text-smam-300">Sistema Municipal de Atendimento Médico</p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl leading-tight font-semibold text-white">
            Gestão de atendimento para as Unidades Básicas de Saúde.
          </h2>
          <p className="mt-4 text-smam-200">
            Cadastro de pacientes, agenda médica e acompanhamento de consultas em um só lugar —
            sem instalação, acessível de qualquer posto.
          </p>
        </div>

        <p className="text-xs text-smam-400">
          Projeto originalmente desenvolvido como TCC do curso Técnico em Informática — ETEC de
          Francisco Morato, 2013.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 grid size-11 place-items-center rounded-xl bg-smam-600 text-white">
              <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
                <path
                  d="M12 4v16M4 12h16"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-xl font-semibold text-slate-900">SMAM</p>
            <p className="text-sm text-slate-500">Sistema Municipal de Atendimento Médico</p>
          </div>

          <div className="cartao p-6">
            <h1 className="text-xl font-semibold text-slate-900">Entrar no sistema</h1>
            <p className="mt-1 mb-6 text-sm text-slate-500">
              Informe suas credenciais de acesso.
            </p>

            <form onSubmit={aoEnviar} className="space-y-4">
              {erro && <Alerta>{erro}</Alerta>}

              <Campo
                rotulo="Usuário"
                name="login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                placeholder="seu.usuario"
              />

              <Campo
                rotulo="Senha"
                name="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />

              <Botao
                type="submit"
                carregando={enviando}
                icone={<LogIn className="size-4" />}
                className="w-full"
              >
                Entrar
              </Botao>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Esqueceu a senha? Procure o administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
