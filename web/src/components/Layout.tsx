import {
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useExpiracaoDeSessao } from '../lib/auth';
import { ROTULOS_PAPEL, iniciais } from '../lib/formato';
import type { Papel } from '../lib/tipos';
import { cn } from './ui';

interface ItemMenu {
  rotulo: string;
  para: string;
  icone: typeof Users;
  papeis?: Papel[];
}

/** Os grupos espelham o menu do SMAM original (Atendimento, Cadastros). */
const GRUPOS: { titulo: string; itens: ItemMenu[] }[] = [
  {
    titulo: 'Geral',
    itens: [{ rotulo: 'Painel', para: '/', icone: LayoutDashboard }],
  },
  {
    titulo: 'Atendimento',
    itens: [
      { rotulo: 'Marcar consulta', para: '/consultas/nova', icone: CalendarPlus },
      { rotulo: 'Agenda do dia', para: '/consultas', icone: CalendarDays },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { rotulo: 'Pacientes', para: '/pacientes', icone: Users },
      { rotulo: 'Médicos', para: '/medicos', icone: Stethoscope },
      { rotulo: 'Especialidades', para: '/especialidades', icone: ClipboardList },
      { rotulo: 'Funcionários', para: '/funcionarios', icone: UserCog, papeis: ['ADMIN'] },
    ],
  },
];

export default function Layout() {
  const { usuario, sair, temPapel } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();

  useExpiracaoDeSessao();

  // Fecha o menu lateral ao navegar no celular.
  useEffect(() => setMenuAberto(false), [pathname]);

  const navegacao = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {GRUPOS.map((grupo) => {
        const itens = grupo.itens.filter((i) => !i.papeis || temPapel(...i.papeis));
        if (itens.length === 0) return null;

        return (
          <div key={grupo.titulo}>
            <p className="mb-2 px-3 text-xs font-semibold tracking-wider text-smam-300/70 uppercase">
              {grupo.titulo}
            </p>
            <ul className="space-y-1">
              {itens.map((item) => (
                <li key={item.para}>
                  <NavLink
                    to={item.para}
                    end={item.para === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-smam-600 text-white'
                          : 'text-smam-50/80 hover:bg-smam-800 hover:text-white',
                      )
                    }
                  >
                    <item.icone className="size-4.5 shrink-0" />
                    {item.rotulo}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const rodapeUsuario = (
    <div className="border-t border-smam-800 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-smam-600 text-sm font-semibold text-white">
          {iniciais(usuario?.nome ?? '?')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{usuario?.nome}</p>
          <p className="truncate text-xs text-smam-300">
            {usuario ? ROTULOS_PAPEL[usuario.papel] : ''}
          </p>
        </div>
        <button
          onClick={sair}
          title="Sair do sistema"
          aria-label="Sair do sistema"
          className="rounded-lg p-2 text-smam-300 hover:bg-smam-800 hover:text-white"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );

  const marca = (
    <Link to="/" className="flex items-center gap-2.5 px-5 py-4">
      <div className="grid size-9 place-items-center rounded-lg bg-smam-500 text-white">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className="font-semibold tracking-tight text-white">SMAM</p>
        <p className="text-[11px] text-smam-300">Atendimento Médico</p>
      </div>
    </Link>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Menu lateral fixo no desktop */}
      <aside className="hidden w-64 shrink-0 flex-col bg-smam-900 lg:flex">
        {marca}
        {navegacao}
        {rodapeUsuario}
      </aside>

      {/* Gaveta no celular */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMenuAberto(false)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-smam-900">
            <div className="flex items-center justify-between">
              {marca}
              <button
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar menu"
                className="mr-3 rounded-lg p-2 text-smam-300 hover:bg-smam-800"
              >
                <X className="size-5" />
              </button>
            </div>
            {navegacao}
            {rodapeUsuario}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-semibold text-slate-800">SMAM</span>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
