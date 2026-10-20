import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { mascaraTelefone } from '../lib/formato';
import type { Especialidade, Funcionario, Medico } from '../lib/tipos';
import {
  Alerta,
  Botao,
  CabecalhoPagina,
  Campo,
  Carregando,
  EstadoVazio,
  Etiqueta,
  Modal,
  Selecao,
} from '../components/ui';

export default function Medicos() {
  const queryClient = useQueryClient();
  const { temPapel } = useAuth();
  const ehAdmin = temPapel('ADMIN');

  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Medico | null>(null);
  const [form, setForm] = useState({ crm: '', funcionarioId: '', especialidadeId: '' });
  const [erro, setErro] = useState<string | null>(null);

  const { data: medicos, isPending } = useQuery({
    queryKey: ['medicos'],
    queryFn: () => api<Medico[]>('/medicos'),
  });

  const { data: especialidades } = useQuery({
    queryKey: ['especialidades'],
    queryFn: () => api<Especialidade[]>('/especialidades'),
  });

  // Só o ADMIN pode listar funcionários, e só ele abre este modal.
  const { data: funcionarios } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => api<Funcionario[]>('/funcionarios'),
    enabled: ehAdmin && modalAberto,
  });

  const salvar = useMutation({
    mutationFn: () =>
      api<Medico>(emEdicao ? `/medicos/${emEdicao.id}` : '/medicos', {
        method: emEdicao ? 'PUT' : 'POST',
        body: {
          crm: form.crm,
          funcionarioId: Number(form.funcionarioId),
          especialidadeId: Number(form.especialidadeId),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicos'] });
      queryClient.invalidateQueries({ queryKey: ['especialidades'] });
      fechar();
    },
    onError: (e) =>
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar o médico.'),
  });

  function abrirNovo() {
    setEmEdicao(null);
    setForm({ crm: '', funcionarioId: '', especialidadeId: '' });
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(medico: Medico) {
    setEmEdicao(medico);
    setForm({
      crm: medico.crm,
      funcionarioId: String(medico.funcionarioId),
      especialidadeId: String(medico.especialidadeId),
    });
    setErro(null);
    setModalAberto(true);
  }

  function fechar() {
    setModalAberto(false);
    setEmEdicao(null);
    setErro(null);
  }

  // Ao criar, só faz sentido oferecer funcionários que ainda não são médicos.
  const funcionariosDisponiveis = (funcionarios ?? []).filter(
    (f) => !f.medico || f.id === emEdicao?.funcionarioId,
  );

  return (
    <div>
      <CabecalhoPagina
        titulo="Médicos"
        descricao="Profissionais habilitados a receber agendamentos."
        acao={
          ehAdmin && (
            <Botao onClick={abrirNovo} icone={<Plus className="size-4" />}>
              Novo médico
            </Botao>
          )
        }
      />

      <div className="cartao overflow-hidden">
        {isPending ? (
          <Carregando />
        ) : !medicos?.length ? (
          <EstadoVazio
            icone={<Stethoscope className="size-10" />}
            titulo="Nenhum médico cadastrado"
            descricao={
              ehAdmin
                ? 'Cadastre o funcionário primeiro e depois vincule o CRM e a especialidade dele aqui.'
                : 'Peça ao administrador para cadastrar os médicos da unidade.'
            }
            acao={
              ehAdmin && (
                <div className="flex gap-3">
                  <Link to="/funcionarios">
                    <Botao variante="secundario">Ver funcionários</Botao>
                  </Link>
                  <Botao onClick={abrirNovo} icone={<Plus className="size-4" />}>
                    Novo médico
                  </Botao>
                </div>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {medicos.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">Dr(a). {m.nome}</p>
                  <p className="text-sm text-slate-500 tabular-nums">
                    CRM {m.crm}
                    {m.contato.telefone && ` · ${mascaraTelefone(m.contato.telefone)}`}
                  </p>
                </div>
                <Etiqueta cor="petroleo">{m.especialidade.nome}</Etiqueta>
                {ehAdmin && (
                  <button
                    onClick={() => abrirEdicao(m)}
                    aria-label={`Editar ${m.nome}`}
                    className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-smam-700"
                  >
                    <Pencil className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal aberto={modalAberto} titulo={emEdicao ? 'Editar médico' : 'Novo médico'} onFechar={fechar}>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            setErro(null);
            salvar.mutate();
          }}
          className="space-y-4"
        >
          {erro && <Alerta>{erro}</Alerta>}

          <Selecao
            rotulo="Funcionário"
            name="funcionarioId"
            obrigatorio
            value={form.funcionarioId}
            onChange={(ev) => setForm((f) => ({ ...f, funcionarioId: ev.target.value }))}
            required
          >
            <option value="">Selecione o funcionário...</option>
            {funcionariosDisponiveis.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome} — {f.cargo}
              </option>
            ))}
          </Selecao>

          {funcionariosDisponiveis.length === 0 && funcionarios && (
            <Alerta tipo="aviso">
              Todos os funcionários já estão vinculados como médicos.{' '}
              <Link to="/funcionarios" className="font-medium underline">
                Cadastre um novo funcionário
              </Link>{' '}
              antes de continuar.
            </Alerta>
          )}

          <Campo
            rotulo="CRM"
            name="crm"
            obrigatorio
            value={form.crm}
            onChange={(ev) => setForm((f) => ({ ...f, crm: ev.target.value.toUpperCase() }))}
            placeholder="123456/SP"
            required
          />

          <Selecao
            rotulo="Especialidade"
            name="especialidadeId"
            obrigatorio
            value={form.especialidadeId}
            onChange={(ev) => setForm((f) => ({ ...f, especialidadeId: ev.target.value }))}
            required
          >
            <option value="">Selecione a especialidade...</option>
            {(especialidades ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </Selecao>

          <div className="flex justify-end gap-3">
            <Botao type="button" variante="secundario" onClick={fechar}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={salvar.isPending}>
              Salvar
            </Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
}
