import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserCog } from 'lucide-react';
import { useState } from 'react';
import { ApiError, api } from '../lib/api';
import { ROTULOS_PAPEL, mascaraCpf, mascaraTelefone } from '../lib/formato';
import type { Funcionario, Papel, Sexo } from '../lib/tipos';
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

const FORM_VAZIO = {
  nome: '',
  cpf: '',
  rg: '',
  sexo: '' as Sexo | '',
  dataNasc: '',
  cargo: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: 'Francisco Morato',
  estado: 'SP',
  cep: '',
  telefone1: '',
  email: '',
  criarAcesso: false,
  login: '',
  senha: '',
  papel: 'ATENDENTE' as Papel,
};

export default function Funcionarios() {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});

  const { data, isPending } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => api<Funcionario[]>('/funcionarios'),
  });

  const salvar = useMutation({
    mutationFn: () =>
      api<Funcionario>('/funcionarios', {
        method: 'POST',
        body: {
          nome: form.nome,
          cpf: form.cpf.replace(/\D/g, ''),
          rg: form.rg || null,
          sexo: form.sexo,
          dataNasc: form.dataNasc,
          cargo: form.cargo,
          endereco: form.endereco,
          numero: form.numero,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          cep: form.cep.replace(/\D/g, '') || null,
          telefone1: form.telefone1.replace(/\D/g, ''),
          email: form.email || null,
          acesso: form.criarAcesso
            ? { login: form.login, senha: form.senha, papel: form.papel }
            : null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      setModalAberto(false);
      setForm(FORM_VAZIO);
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        setErroGeral(e.campos?.length ? 'Confira os campos destacados.' : e.message);
        setErrosCampo(
          Object.fromEntries(
            (e.campos ?? []).map((c) => [c.campo.replace('acesso.', ''), c.mensagem]),
          ),
        );
      } else {
        setErroGeral('Não foi possível salvar o funcionário.');
      }
    },
  });

  const campo =
    (chave: keyof typeof FORM_VAZIO, mascara?: (v: string) => string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [chave]: mascara ? mascara(e.target.value) : e.target.value }));

  return (
    <div>
      <CabecalhoPagina
        titulo="Funcionários"
        descricao="Equipe da unidade e credenciais de acesso ao sistema."
        acao={
          <Botao
            onClick={() => {
              setForm(FORM_VAZIO);
              setErroGeral(null);
              setErrosCampo({});
              setModalAberto(true);
            }}
            icone={<Plus className="size-4" />}
          >
            Novo funcionário
          </Botao>
        }
      />

      <div className="cartao overflow-hidden">
        {isPending ? (
          <Carregando />
        ) : !data?.length ? (
          <EstadoVazio
            icone={<UserCog className="size-10" />}
            titulo="Nenhum funcionário cadastrado"
            descricao="Cadastre a equipe da unidade para liberar os acessos ao sistema."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{f.nome}</p>
                  <p className="text-sm text-slate-500 tabular-nums">
                    {f.cargo} · {mascaraCpf(f.cpf)} · {mascaraTelefone(f.telefone1)}
                  </p>
                </div>
                {f.medico && <Etiqueta cor="petroleo">{f.medico.especialidade.nome}</Etiqueta>}
                {f.usuario ? (
                  <Etiqueta cor="azul">{ROTULOS_PAPEL[f.usuario.papel]}</Etiqueta>
                ) : (
                  <Etiqueta>Sem acesso</Etiqueta>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        aberto={modalAberto}
        titulo="Novo funcionário"
        onFechar={() => setModalAberto(false)}
        largura="max-w-2xl"
      >
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            setErroGeral(null);
            setErrosCampo({});
            salvar.mutate();
          }}
          className="space-y-5"
        >
          {erroGeral && <Alerta>{erroGeral}</Alerta>}

          <div className="grid gap-4 sm:grid-cols-6">
            <Campo
              className="sm:col-span-4"
              rotulo="Nome completo"
              name="nome"
              obrigatorio
              value={form.nome}
              onChange={campo('nome')}
              erro={errosCampo.nome}
              required
            />
            <Campo
              className="sm:col-span-2"
              rotulo="Cargo"
              name="cargo"
              obrigatorio
              placeholder="Ex.: Atendente"
              value={form.cargo}
              onChange={campo('cargo')}
              erro={errosCampo.cargo}
              required
            />
            <Campo
              className="sm:col-span-2"
              rotulo="CPF"
              name="cpf"
              inputMode="numeric"
              obrigatorio
              placeholder="000.000.000-00"
              value={mascaraCpf(form.cpf)}
              onChange={campo('cpf', mascaraCpf)}
              erro={errosCampo.cpf}
              required
            />
            <Campo
              className="sm:col-span-2"
              rotulo="RG"
              name="rg"
              value={form.rg}
              onChange={campo('rg')}
            />
            <Selecao
              className="sm:col-span-2"
              rotulo="Sexo"
              name="sexo"
              obrigatorio
              value={form.sexo}
              onChange={campo('sexo')}
              erro={errosCampo.sexo}
              required
            >
              <option value="">Selecione...</option>
              <option value="FEMININO">Feminino</option>
              <option value="MASCULINO">Masculino</option>
              <option value="OUTRO">Outro</option>
            </Selecao>
            <Campo
              className="sm:col-span-2"
              rotulo="Data de nascimento"
              name="dataNasc"
              type="date"
              obrigatorio
              value={form.dataNasc}
              onChange={campo('dataNasc')}
              erro={errosCampo.dataNasc}
              required
            />
            <Campo
              className="sm:col-span-2"
              rotulo="Telefone"
              name="telefone1"
              inputMode="tel"
              obrigatorio
              value={mascaraTelefone(form.telefone1)}
              onChange={campo('telefone1', mascaraTelefone)}
              erro={errosCampo.telefone1}
              required
            />
            <Campo
              className="sm:col-span-2"
              rotulo="E-mail"
              name="email"
              type="email"
              value={form.email}
              onChange={campo('email')}
              erro={errosCampo.email}
            />
            <Campo
              className="sm:col-span-4"
              rotulo="Logradouro"
              name="endereco"
              obrigatorio
              value={form.endereco}
              onChange={campo('endereco')}
              erro={errosCampo.endereco}
              required
            />
            <Campo
              className="sm:col-span-2"
              rotulo="Número"
              name="numero"
              obrigatorio
              value={form.numero}
              onChange={campo('numero')}
              erro={errosCampo.numero}
              required
            />
            <Campo
              className="sm:col-span-2"
              rotulo="Bairro"
              name="bairro"
              obrigatorio
              value={form.bairro}
              onChange={campo('bairro')}
              erro={errosCampo.bairro}
              required
            />
            <Campo
              className="sm:col-span-3"
              rotulo="Cidade"
              name="cidade"
              obrigatorio
              value={form.cidade}
              onChange={campo('cidade')}
              required
            />
            <Campo
              className="sm:col-span-1"
              rotulo="UF"
              name="estado"
              maxLength={2}
              obrigatorio
              value={form.estado}
              onChange={(ev) => setForm((f) => ({ ...f, estado: ev.target.value.toUpperCase() }))}
              required
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.criarAcesso}
                onChange={(ev) => setForm((f) => ({ ...f, criarAcesso: ev.target.checked }))}
                className="mt-0.5 size-4 rounded border-slate-300 text-smam-600 focus:ring-smam-600"
              />
              <span>
                <span className="text-sm font-medium text-slate-800">
                  Criar credencial de acesso
                </span>
                <span className="block text-xs text-slate-500">
                  Permite que este funcionário faça login no sistema.
                </span>
              </span>
            </label>

            {form.criarAcesso && (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Campo
                  rotulo="Login"
                  name="login"
                  obrigatorio
                  value={form.login}
                  onChange={campo('login')}
                  erro={errosCampo.login}
                  required
                />
                <Campo
                  rotulo="Senha provisória"
                  name="senha"
                  type="text"
                  obrigatorio
                  dica="Mínimo 6 caracteres"
                  value={form.senha}
                  onChange={campo('senha')}
                  erro={errosCampo.senha}
                  required
                />
                <Selecao
                  rotulo="Perfil"
                  name="papel"
                  obrigatorio
                  value={form.papel}
                  onChange={campo('papel')}
                  required
                >
                  <option value="ATENDENTE">Atendente</option>
                  <option value="MEDICO">Médico</option>
                  <option value="ADMIN">Administrador</option>
                </Selecao>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Botao type="button" variante="secundario" onClick={() => setModalAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={salvar.isPending}>
              Cadastrar funcionário
            </Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
}
