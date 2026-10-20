import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Especialidade } from '../lib/tipos';
import {
  Alerta,
  Botao,
  CabecalhoPagina,
  Campo,
  Carregando,
  EstadoVazio,
  Etiqueta,
  Modal,
} from '../components/ui';

export default function Especialidades() {
  const queryClient = useQueryClient();
  const { temPapel } = useAuth();
  const podeEditar = temPapel('ADMIN', 'ATENDENTE');

  const [emEdicao, setEmEdicao] = useState<Especialidade | null>(null);
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ['especialidades'],
    queryFn: () => api<Especialidade[]>('/especialidades'),
  });

  const salvar = useMutation({
    mutationFn: () =>
      api<Especialidade>(emEdicao ? `/especialidades/${emEdicao.id}` : '/especialidades', {
        method: emEdicao ? 'PUT' : 'POST',
        body: { nome },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['especialidades'] });
      fechar();
    },
    onError: (e) =>
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar a especialidade.'),
  });

  function abrirNova() {
    setEmEdicao(null);
    setNome('');
    setErro(null);
    setCriando(true);
  }

  function abrirEdicao(especialidade: Especialidade) {
    setEmEdicao(especialidade);
    setNome(especialidade.nome);
    setErro(null);
    setCriando(true);
  }

  function fechar() {
    setCriando(false);
    setEmEdicao(null);
    setNome('');
    setErro(null);
  }

  return (
    <div>
      <CabecalhoPagina
        titulo="Especialidades"
        descricao="Áreas de atendimento oferecidas pela unidade."
        acao={
          podeEditar && (
            <Botao onClick={abrirNova} icone={<Plus className="size-4" />}>
              Nova especialidade
            </Botao>
          )
        }
      />

      <div className="cartao overflow-hidden">
        {isPending ? (
          <Carregando />
        ) : !data?.length ? (
          <EstadoVazio
            icone={<ClipboardList className="size-10" />}
            titulo="Nenhuma especialidade cadastrada"
            descricao="Cadastre as áreas de atendimento antes de registrar médicos."
            acao={
              podeEditar && (
                <Botao onClick={abrirNova} icone={<Plus className="size-4" />}>
                  Nova especialidade
                </Botao>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map((e) => (
              <li key={e.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="flex-1 font-medium text-slate-800">{e.nome}</span>
                <Etiqueta cor={e._count?.medicos ? 'petroleo' : 'cinza'}>
                  {e._count?.medicos ?? 0} médico{e._count?.medicos === 1 ? '' : 's'}
                </Etiqueta>
                {podeEditar && (
                  <button
                    onClick={() => abrirEdicao(e)}
                    aria-label={`Editar ${e.nome}`}
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

      <Modal
        aberto={criando}
        titulo={emEdicao ? 'Editar especialidade' : 'Nova especialidade'}
        onFechar={fechar}
      >
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            setErro(null);
            salvar.mutate();
          }}
          className="space-y-4"
        >
          {erro && <Alerta>{erro}</Alerta>}
          <Campo
            rotulo="Nome da especialidade"
            name="nome"
            obrigatorio
            autoFocus
            value={nome}
            onChange={(ev) => setNome(ev.target.value)}
            placeholder="Ex.: Clínica Geral"
            required
          />
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
