import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Clock,
  UserPlus,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  ROTULOS_PRIORIDADE,
  formatarDataLonga,
  formatarHora,
  hojeISO,
  primeiroNome,
} from '../lib/formato';
import type { Consulta, ResumoDia } from '../lib/tipos';
import { Carregando, Etiqueta, EstadoVazio, cn } from '../components/ui';

const CORES_PRIORIDADE = {
  NORMAL: 'cinza',
  PREFERENCIAL: 'azul',
  URGENTE: 'vermelho',
} as const;

export default function Painel() {
  const { usuario } = useAuth();
  const hoje = hojeISO();

  const { data: resumo, isPending: carregandoResumo } = useQuery({
    queryKey: ['resumo', hoje],
    queryFn: () => api<ResumoDia>('/consultas/resumo', { query: { data: hoje } }),
  });

  const { data: consultas, isPending: carregandoConsultas } = useQuery({
    queryKey: ['consultas', { data: hoje, status: 'AGENDADA' }],
    queryFn: () =>
      api<Consulta[]>('/consultas', { query: { data: hoje, status: 'AGENDADA' } }),
  });

  const cartoes = [
    {
      rotulo: 'Consultas agendadas',
      valor: resumo?.agendadas,
      icone: CalendarDays,
      cor: 'text-smam-600 bg-smam-50',
    },
    {
      rotulo: 'Já atendidas',
      valor: resumo?.concluidas,
      icone: CalendarCheck,
      cor: 'text-emerald-600 bg-emerald-50',
    },
    {
      rotulo: 'Casos urgentes',
      valor: resumo?.urgentes,
      icone: AlertTriangle,
      cor: 'text-red-600 bg-red-50',
    },
    {
      rotulo: 'Pacientes cadastrados',
      valor: resumo?.pacientesAtivos,
      icone: Users,
      cor: 'text-sky-600 bg-sky-50',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Olá, {primeiroNome(usuario?.nome ?? '')}.
        </h1>
        <p className="mt-1 text-sm text-slate-500 first-letter:uppercase">
          {formatarDataLonga(new Date())}
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cartoes.map((c) => (
          <div key={c.rotulo} className="cartao flex items-center gap-4 p-5">
            <div className={cn('grid size-11 shrink-0 place-items-center rounded-lg', c.cor)}>
              <c.icone className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                {carregandoResumo ? '—' : (c.valor ?? 0)}
              </p>
              <p className="truncate text-sm text-slate-500">{c.rotulo}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link
          to="/consultas/nova"
          className="cartao flex items-center gap-3 p-4 transition-colors hover:border-smam-300 hover:bg-smam-50/50"
        >
          <CalendarPlus className="size-5 shrink-0 text-smam-600" />
          <div>
            <p className="text-sm font-medium text-slate-800">Marcar consulta</p>
            <p className="text-xs text-slate-500">Agendar atendimento para um paciente</p>
          </div>
        </Link>
        <Link
          to="/pacientes/novo"
          className="cartao flex items-center gap-3 p-4 transition-colors hover:border-smam-300 hover:bg-smam-50/50"
        >
          <UserPlus className="size-5 shrink-0 text-smam-600" />
          <div>
            <p className="text-sm font-medium text-slate-800">Cadastrar paciente</p>
            <p className="text-xs text-slate-500">Incluir um novo paciente na base</p>
          </div>
        </Link>
      </div>

      <section className="cartao overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="font-semibold text-slate-800">Próximos atendimentos de hoje</h2>
          <Link to="/consultas" className="text-sm font-medium text-smam-700 hover:underline">
            Ver agenda completa
          </Link>
        </div>

        {carregandoConsultas ? (
          <Carregando />
        ) : !consultas?.length ? (
          <EstadoVazio
            icone={<CalendarDays className="size-10" />}
            titulo="Nenhuma consulta agendada para hoje"
            descricao="Os agendamentos do dia aparecem aqui."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {consultas.slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex w-16 shrink-0 items-center gap-1.5 text-sm font-medium text-slate-700 tabular-nums">
                  <Clock className="size-3.5 text-slate-400" />
                  {formatarHora(c.dataHora)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{c.paciente.nome}</p>
                  <p className="truncate text-sm text-slate-500">
                    {c.especialidade.nome} · Dr(a). {c.medico.funcionario.nome}
                  </p>
                </div>
                {c.prioridade !== 'NORMAL' && (
                  <Etiqueta cor={CORES_PRIORIDADE[c.prioridade]}>
                    {ROTULOS_PRIORIDADE[c.prioridade]}
                  </Etiqueta>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
