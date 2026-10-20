import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserX,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import {
  ROTULOS_PRIORIDADE,
  ROTULOS_STATUS,
  calcularIdade,
  formatarDataLonga,
  formatarHora,
  hojeISO,
  mascaraTelefone,
} from '../lib/formato';
import type { Consulta, Especialidade, StatusConsulta } from '../lib/tipos';
import {
  Alerta,
  Botao,
  CabecalhoPagina,
  Carregando,
  EstadoVazio,
  Etiqueta,
  Selecao,
  cn,
} from '../components/ui';

const CORES_PRIORIDADE = { NORMAL: 'cinza', PREFERENCIAL: 'azul', URGENTE: 'vermelho' } as const;
const CORES_STATUS = {
  AGENDADA: 'petroleo',
  CONCLUIDA: 'verde',
  CANCELADA: 'vermelho',
  FALTOU: 'ambar',
} as const;

/** Soma dias a uma data AAAA-MM-DD sem esbarrar em fuso horário. */
function deslocarDia(dataISO: string, dias: number): string {
  const d = new Date(`${dataISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default function Agenda() {
  const queryClient = useQueryClient();
  const [data, setData] = useState(hojeISO());
  const [especialidadeId, setEspecialidadeId] = useState('');
  const [status, setStatus] = useState<StatusConsulta | ''>('');
  const [erro, setErro] = useState<string | null>(null);

  const { data: consultas, isPending } = useQuery({
    queryKey: ['consultas', { data, especialidadeId, status }],
    queryFn: () => api<Consulta[]>('/consultas', { query: { data, especialidadeId, status } }),
  });

  const { data: especialidades } = useQuery({
    queryKey: ['especialidades'],
    queryFn: () => api<Especialidade[]>('/especialidades'),
  });

  const alterarStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusConsulta }) =>
      api<Consulta>(`/consultas/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultas'] });
      queryClient.invalidateQueries({ queryKey: ['resumo'] });
    },
    onError: (e) =>
      setErro(e instanceof ApiError ? e.message : 'Não foi possível atualizar a consulta.'),
  });

  const ehHoje = data === hojeISO();

  return (
    <div>
      <CabecalhoPagina
        titulo="Agenda do dia"
        descricao="Consultas marcadas e acompanhamento do atendimento."
        acao={
          <Link to="/consultas/nova">
            <Botao icone={<CalendarPlus className="size-4" />}>Marcar consulta</Botao>
          </Link>
        }
      />

      {erro && (
        <div className="mb-4">
          <Alerta>{erro}</Alerta>
        </div>
      )}

      <div className="cartao mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setData((d) => deslocarDia(d, -1))}
            aria-label="Dia anterior"
            className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div>
            <label className="rotulo" htmlFor="data">
              Data
            </label>
            <input
              id="data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="campo"
            />
          </div>
          <button
            onClick={() => setData((d) => deslocarDia(d, 1))}
            aria-label="Dia seguinte"
            className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-500 hover:bg-slate-50"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {!ehHoje && (
          <Botao variante="secundario" onClick={() => setData(hojeISO())}>
            Hoje
          </Botao>
        )}

        <Selecao
          className="min-w-44"
          rotulo="Especialidade"
          name="especialidade"
          value={especialidadeId}
          onChange={(e) => setEspecialidadeId(e.target.value)}
        >
          <option value="">Todas</option>
          {(especialidades ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </Selecao>

        <Selecao
          className="min-w-40"
          rotulo="Situação"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusConsulta | '')}
        >
          <option value="">Todas</option>
          <option value="AGENDADA">Agendadas</option>
          <option value="CONCLUIDA">Concluídas</option>
          <option value="CANCELADA">Canceladas</option>
          <option value="FALTOU">Faltas</option>
        </Selecao>
      </div>

      <p className="mb-3 text-sm text-slate-500 first-letter:uppercase">
        {formatarDataLonga(`${data}T12:00:00Z`)}
        {consultas && ` · ${consultas.length} consulta${consultas.length === 1 ? '' : 's'}`}
      </p>

      <div className="cartao overflow-hidden">
        {isPending ? (
          <Carregando texto="Carregando agenda..." />
        ) : !consultas?.length ? (
          <EstadoVazio
            icone={<CalendarDays className="size-10" />}
            titulo="Nenhuma consulta nesta data"
            descricao="Ajuste os filtros ou marque um novo atendimento."
            acao={
              <Link to="/consultas/nova">
                <Botao icone={<CalendarPlus className="size-4" />}>Marcar consulta</Botao>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {consultas.map((c) => (
              <li
                key={c.id}
                className={cn(
                  'px-5 py-4',
                  c.status === 'CANCELADA' && 'bg-slate-50/80 opacity-60',
                )}
              >
                <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                  <div className="flex w-16 shrink-0 items-center gap-1.5 pt-0.5 font-medium text-slate-700 tabular-nums">
                    <Clock className="size-3.5 text-slate-400" />
                    {formatarHora(c.dataHora)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/pacientes/${c.paciente.id}`}
                      className="font-medium text-slate-800 hover:text-smam-700 hover:underline"
                    >
                      {c.paciente.nome}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {calcularIdade(c.paciente.dataNasc)} anos ·{' '}
                      {mascaraTelefone(c.paciente.telefone1)}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {c.especialidade.nome} · Dr(a). {c.medico.funcionario.nome}
                    </p>
                    {c.observacoes && (
                      <p className="mt-1.5 text-sm text-slate-500 italic">{c.observacoes}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {c.prioridade !== 'NORMAL' && (
                        <Etiqueta cor={CORES_PRIORIDADE[c.prioridade]}>
                          {ROTULOS_PRIORIDADE[c.prioridade]}
                        </Etiqueta>
                      )}
                      <Etiqueta cor={CORES_STATUS[c.status]}>{ROTULOS_STATUS[c.status]}</Etiqueta>
                    </div>

                    {c.status === 'AGENDADA' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => alterarStatus.mutate({ id: c.id, status: 'CONCLUIDA' })}
                          disabled={alterarStatus.isPending}
                          title="Marcar como atendida"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Check className="size-3.5" />
                          Atendida
                        </button>
                        <button
                          onClick={() => alterarStatus.mutate({ id: c.id, status: 'FALTOU' })}
                          disabled={alterarStatus.isPending}
                          title="Registrar falta do paciente"
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                        >
                          <UserX className="size-3.5" />
                          Faltou
                        </button>
                        <button
                          onClick={() => alterarStatus.mutate({ id: c.id, status: 'CANCELADA' })}
                          disabled={alterarStatus.isPending}
                          title="Cancelar consulta"
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          <X className="size-3.5" />
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
