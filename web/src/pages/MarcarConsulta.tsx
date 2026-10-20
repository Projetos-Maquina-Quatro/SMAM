import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarCheck, Check, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import { calcularIdade, formatarHora, hojeISO, mascaraCpf } from '../lib/formato';
import type { Consulta, Especialidade, Medico, Pagina, Paciente, Prioridade } from '../lib/tipos';
import {
  Alerta,
  Botao,
  CabecalhoPagina,
  Carregando,
  Selecao,
  cn,
} from '../components/ui';

export default function MarcarConsulta() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState('');
  const [buscaAtiva, setBuscaAtiva] = useState('');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [especialidadeId, setEspecialidadeId] = useState('');
  const [medicoId, setMedicoId] = useState('');
  const [data, setData] = useState(hojeISO());
  const [horario, setHorario] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('NORMAL');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBuscaAtiva(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);

  const { data: resultados, isFetching: buscando } = useQuery({
    queryKey: ['pacientes', { busca: buscaAtiva, pagina: 1 }],
    queryFn: () =>
      api<Pagina<Paciente>>('/pacientes', { query: { busca: buscaAtiva, porPagina: 8 } }),
    enabled: buscaAtiva.length >= 2 && !paciente,
  });

  const { data: especialidades } = useQuery({
    queryKey: ['especialidades'],
    queryFn: () => api<Especialidade[]>('/especialidades'),
  });

  const { data: medicos } = useQuery({
    queryKey: ['medicos', { especialidadeId }],
    queryFn: () => api<Medico[]>('/medicos', { query: { especialidadeId } }),
    enabled: !!especialidadeId,
  });

  const { data: horarios, isPending: carregandoHorarios } = useQuery({
    queryKey: ['horarios-livres', { medicoId, data }],
    queryFn: () => api<string[]>('/consultas/horarios-livres', { query: { medicoId, data } }),
    enabled: !!medicoId && !!data,
  });

  // Trocar de médico ou de dia invalida o horário já escolhido.
  useEffect(() => setHorario(''), [medicoId, data]);
  useEffect(() => setMedicoId(''), [especialidadeId]);

  const agendar = useMutation({
    mutationFn: () =>
      api<Consulta>('/consultas', {
        method: 'POST',
        body: {
          pacienteId: paciente!.id,
          medicoId: Number(medicoId),
          dataHora: horario,
          prioridade,
          observacoes: observacoes || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultas'] });
      queryClient.invalidateQueries({ queryKey: ['resumo'] });
      navigate('/consultas');
    },
    onError: (e) =>
      setErro(e instanceof ApiError ? e.message : 'Não foi possível marcar a consulta.'),
  });

  const podeAgendar = !!paciente && !!medicoId && !!horario;

  const medicoSelecionado = useMemo(
    () => medicos?.find((m) => String(m.id) === medicoId),
    [medicos, medicoId],
  );

  return (
    <div>
      <Link
        to="/consultas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-smam-700"
      >
        <ArrowLeft className="size-4" />
        Voltar para a agenda
      </Link>

      <CabecalhoPagina
        titulo="Marcar consulta"
        descricao="Selecione o paciente, a especialidade e um horário disponível."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setErro(null);
          agendar.mutate();
        }}
        className="space-y-6"
      >
        {erro && <Alerta>{erro}</Alerta>}

        {/* Etapa 1 — paciente */}
        <section className="cartao p-5">
          <h2 className="mb-4 font-semibold text-slate-800">
            <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-smam-100 text-xs font-bold text-smam-800">
              1
            </span>
            Paciente
          </h2>

          {paciente ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-smam-200 bg-smam-50 p-4">
              <div>
                <p className="font-medium text-slate-800">{paciente.nome}</p>
                <p className="text-sm text-slate-600 tabular-nums">
                  {calcularIdade(paciente.dataNasc)} anos
                  {paciente.cpf && ` · ${mascaraCpf(paciente.cpf)}`}
                </p>
              </div>
              <Botao
                type="button"
                variante="secundario"
                onClick={() => {
                  setPaciente(null);
                  setBusca('');
                }}
              >
                Trocar paciente
              </Botao>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar paciente por nome, CPF ou Cartão SUS..."
                  aria-label="Buscar paciente"
                  autoFocus
                  className="campo pl-9"
                />
              </div>

              {buscaAtiva.length >= 2 && (
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                  {buscando ? (
                    <Carregando texto="Buscando..." />
                  ) : !resultados?.itens.length ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">
                      Nenhum paciente encontrado.{' '}
                      <Link to="/pacientes/novo" className="font-medium text-smam-700 underline">
                        Cadastrar novo paciente
                      </Link>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {resultados.itens.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => setPaciente(p)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-800">{p.nome}</p>
                              <p className="text-sm text-slate-500 tabular-nums">
                                {calcularIdade(p.dataNasc)} anos
                                {p.cpf && ` · ${mascaraCpf(p.cpf)}`}
                              </p>
                            </div>
                            <Check className="size-4 shrink-0 text-slate-300" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* Etapa 2 — profissional */}
        <section className="cartao p-5">
          <h2 className="mb-4 font-semibold text-slate-800">
            <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-smam-100 text-xs font-bold text-smam-800">
              2
            </span>
            Especialidade e profissional
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao
              rotulo="Especialidade"
              name="especialidade"
              obrigatorio
              value={especialidadeId}
              onChange={(e) => setEspecialidadeId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {(especialidades ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </Selecao>

            <Selecao
              rotulo="Médico"
              name="medico"
              obrigatorio
              value={medicoId}
              onChange={(e) => setMedicoId(e.target.value)}
              disabled={!especialidadeId}
              required
            >
              <option value="">
                {especialidadeId ? 'Selecione...' : 'Escolha a especialidade primeiro'}
              </option>
              {(medicos ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  Dr(a). {m.nome} — CRM {m.crm}
                </option>
              ))}
            </Selecao>
          </div>

          {especialidadeId && medicos?.length === 0 && (
            <div className="mt-4">
              <Alerta tipo="aviso">
                Não há médicos cadastrados nesta especialidade.{' '}
                <Link to="/medicos" className="font-medium underline">
                  Cadastrar médico
                </Link>
              </Alerta>
            </div>
          )}
        </section>

        {/* Etapa 3 — horário */}
        <section className="cartao p-5">
          <h2 className="mb-4 font-semibold text-slate-800">
            <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-smam-100 text-xs font-bold text-smam-800">
              3
            </span>
            Data e horário
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="rotulo" htmlFor="data">
                Data<span className="ml-0.5 text-red-500">*</span>
              </label>
              <input
                id="data"
                type="date"
                value={data}
                min={hojeISO()}
                onChange={(e) => setData(e.target.value)}
                className="campo"
                required
              />
            </div>

            <Selecao
              rotulo="Prioridade"
              name="prioridade"
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as Prioridade)}
            >
              <option value="NORMAL">Normal</option>
              <option value="PREFERENCIAL">Preferencial (idoso, gestante, PCD)</option>
              <option value="URGENTE">Urgente</option>
            </Selecao>
          </div>

          <div className="mt-5">
            <p className="rotulo">
              Horários disponíveis<span className="ml-0.5 text-red-500">*</span>
            </p>

            {!medicoId ? (
              <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Selecione um médico para ver os horários livres.
              </p>
            ) : carregandoHorarios ? (
              <Carregando texto="Verificando agenda..." />
            ) : !horarios?.length ? (
              <p className="rounded-lg bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
                Dr(a). {medicoSelecionado?.nome} não tem horários livres nesta data. Tente outro
                dia.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
                {horarios.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorario(h)}
                    aria-pressed={horario === h}
                    className={cn(
                      'rounded-lg border px-2 py-2.5 text-sm font-medium tabular-nums transition-colors',
                      horario === h
                        ? 'border-smam-600 bg-smam-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-smam-400 hover:bg-smam-50',
                    )}
                  >
                    {formatarHora(h)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5">
            <label className="rotulo" htmlFor="observacoes">
              Observações
            </label>
            <textarea
              id="observacoes"
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Motivo da consulta, encaminhamento, queixa principal..."
              className="campo resize-y"
            />
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Link to="/consultas">
            <Botao type="button" variante="secundario">
              Cancelar
            </Botao>
          </Link>
          <Botao
            type="submit"
            disabled={!podeAgendar}
            carregando={agendar.isPending}
            icone={<CalendarCheck className="size-4" />}
          >
            Confirmar agendamento
          </Botao>
        </div>
      </form>
    </div>
  );
}
