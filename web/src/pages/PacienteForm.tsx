import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import {
  ROTULOS_STATUS,
  formatarDataHora,
  mascaraCartaoSus,
  mascaraCep,
  mascaraCpf,
  mascaraTelefone,
  paraInputDate,
} from '../lib/formato';
import type { Consulta, Paciente, Sexo } from '../lib/tipos';
import { Alerta, Botao, CabecalhoPagina, Campo, Carregando, Etiqueta, Selecao } from '../components/ui';

type Formulario = {
  nome: string;
  cpf: string;
  rg: string;
  cartaoSus: string;
  sexo: Sexo | '';
  dataNasc: string;
  nomeResponsavel: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone1: string;
  telefone2: string;
  email: string;
  observacoes: string;
};

const VAZIO: Formulario = {
  nome: '',
  cpf: '',
  rg: '',
  cartaoSus: '',
  sexo: '',
  dataNasc: '',
  nomeResponsavel: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: 'Francisco Morato',
  estado: 'SP',
  cep: '',
  telefone1: '',
  telefone2: '',
  email: '',
  observacoes: '',
};

type PacienteComConsultas = Paciente & { consultas: Consulta[] };

export default function PacienteForm() {
  const { id } = useParams();
  const editando = id !== undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<Formulario>(VAZIO);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});

  const { data: paciente, isPending } = useQuery({
    queryKey: ['paciente', id],
    queryFn: () => api<PacienteComConsultas>(`/pacientes/${id}`),
    enabled: editando,
  });

  useEffect(() => {
    if (!paciente) return;
    setForm({
      nome: paciente.nome,
      cpf: paciente.cpf ?? '',
      rg: paciente.rg ?? '',
      cartaoSus: paciente.cartaoSus ?? '',
      sexo: paciente.sexo,
      dataNasc: paraInputDate(paciente.dataNasc),
      nomeResponsavel: paciente.nomeResponsavel ?? '',
      endereco: paciente.endereco,
      numero: paciente.numero,
      bairro: paciente.bairro,
      cidade: paciente.cidade,
      estado: paciente.estado,
      cep: paciente.cep ?? '',
      telefone1: paciente.telefone1,
      telefone2: paciente.telefone2 ?? '',
      email: paciente.email ?? '',
      observacoes: paciente.observacoes ?? '',
    });
  }, [paciente]);

  const salvar = useMutation({
    mutationFn: (dados: Formulario) =>
      api<Paciente>(editando ? `/pacientes/${id}` : '/pacientes', {
        method: editando ? 'PUT' : 'POST',
        body: {
          ...dados,
          // A API normaliza, mas enviar já limpo evita falso positivo de validação.
          cpf: dados.cpf.replace(/\D/g, '') || null,
          cartaoSus: dados.cartaoSus.replace(/\D/g, '') || null,
          cep: dados.cep.replace(/\D/g, '') || null,
          telefone1: dados.telefone1.replace(/\D/g, ''),
          telefone2: dados.telefone2.replace(/\D/g, '') || null,
          rg: dados.rg || null,
          nomeResponsavel: dados.nomeResponsavel || null,
          email: dados.email || null,
          observacoes: dados.observacoes || null,
        },
      }),
    onSuccess: (salvo) => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      queryClient.invalidateQueries({ queryKey: ['paciente', String(salvo.id)] });
      navigate('/pacientes');
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        setErroGeral(e.campos?.length ? 'Confira os campos destacados abaixo.' : e.message);
        setErrosCampo(Object.fromEntries((e.campos ?? []).map((c) => [c.campo, c.mensagem])));
      } else {
        setErroGeral('Não foi possível salvar. Tente novamente.');
      }
    },
  });

  function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setErroGeral(null);
    setErrosCampo({});
    salvar.mutate(form);
  }

  const campo =
    (chave: keyof Formulario, mascara?: (v: string) => string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({
        ...f,
        [chave]: mascara ? mascara(e.target.value) : e.target.value,
      }));

  if (editando && isPending) return <Carregando texto="Carregando paciente..." />;

  return (
    <div>
      <Link
        to="/pacientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-smam-700"
      >
        <ArrowLeft className="size-4" />
        Voltar para pacientes
      </Link>

      <CabecalhoPagina
        titulo={editando ? 'Editar paciente' : 'Novo paciente'}
        descricao={
          editando
            ? 'Atualize os dados cadastrais do paciente.'
            : 'Preencha os dados do paciente. Campos com * são obrigatórios.'
        }
      />

      <form onSubmit={aoEnviar} className="space-y-6">
        {erroGeral && <Alerta>{erroGeral}</Alerta>}

        <section className="cartao p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Dados pessoais</h2>
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
              rotulo="CPF"
              name="cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={mascaraCpf(form.cpf)}
              onChange={campo('cpf', mascaraCpf)}
              erro={errosCampo.cpf}
            />
            <Campo
              className="sm:col-span-2"
              rotulo="RG"
              name="rg"
              value={form.rg}
              onChange={campo('rg')}
              erro={errosCampo.rg}
            />

            <Campo
              className="sm:col-span-3"
              rotulo="Cartão SUS"
              name="cartaoSus"
              inputMode="numeric"
              placeholder="000 0000 0000 0000"
              dica="15 dígitos"
              value={mascaraCartaoSus(form.cartaoSus)}
              onChange={campo('cartaoSus', mascaraCartaoSus)}
              erro={errosCampo.cartaoSus}
            />
            <Campo
              className="sm:col-span-3"
              rotulo="Nome do responsável"
              name="nomeResponsavel"
              dica="Obrigatório apenas para menores de idade"
              value={form.nomeResponsavel}
              onChange={campo('nomeResponsavel')}
              erro={errosCampo.nomeResponsavel}
            />
          </div>
        </section>

        <section className="cartao p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Endereço</h2>
          <div className="grid gap-4 sm:grid-cols-6">
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
              className="sm:col-span-2"
              rotulo="CEP"
              name="cep"
              inputMode="numeric"
              placeholder="00000-000"
              value={mascaraCep(form.cep)}
              onChange={campo('cep', mascaraCep)}
              erro={errosCampo.cep}
            />
            <Campo
              className="sm:col-span-1"
              rotulo="UF"
              name="estado"
              maxLength={2}
              obrigatorio
              value={form.estado}
              onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value.toUpperCase() }))}
              erro={errosCampo.estado}
              required
            />
            <Campo
              className="sm:col-span-3"
              rotulo="Cidade"
              name="cidade"
              obrigatorio
              value={form.cidade}
              onChange={campo('cidade')}
              erro={errosCampo.cidade}
              required
            />
          </div>
        </section>

        <section className="cartao p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Contato</h2>
          <div className="grid gap-4 sm:grid-cols-6">
            <Campo
              className="sm:col-span-2"
              rotulo="Telefone principal"
              name="telefone1"
              inputMode="tel"
              placeholder="(11) 90000-0000"
              obrigatorio
              value={mascaraTelefone(form.telefone1)}
              onChange={campo('telefone1', mascaraTelefone)}
              erro={errosCampo.telefone1}
              required
            />
            <Campo
              className="sm:col-span-2"
              rotulo="Telefone alternativo"
              name="telefone2"
              inputMode="tel"
              placeholder="(11) 0000-0000"
              value={mascaraTelefone(form.telefone2)}
              onChange={campo('telefone2', mascaraTelefone)}
              erro={errosCampo.telefone2}
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
            <div className="sm:col-span-6">
              <label className="rotulo" htmlFor="observacoes">
                Observações
              </label>
              <textarea
                id="observacoes"
                name="observacoes"
                rows={3}
                value={form.observacoes}
                onChange={campo('observacoes')}
                placeholder="Alergias, condições pré-existentes, informações relevantes..."
                className="campo resize-y"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Link to="/pacientes">
            <Botao type="button" variante="secundario">
              Cancelar
            </Botao>
          </Link>
          <Botao type="submit" carregando={salvar.isPending} icone={<Save className="size-4" />}>
            {editando ? 'Salvar alterações' : 'Cadastrar paciente'}
          </Botao>
        </div>
      </form>

      {editando && paciente && (
        <section className="cartao mt-6 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h2 className="font-semibold text-slate-800">Histórico de consultas</h2>
          </div>
          {paciente.consultas.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Este paciente ainda não tem consultas registradas.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {paciente.consultas.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <span className="text-sm font-medium text-slate-700 tabular-nums">
                    {formatarDataHora(c.dataHora)}
                  </span>
                  <span className="flex-1 text-sm text-slate-500">
                    {c.especialidade.nome} · Dr(a). {c.medico.funcionario.nome}
                  </span>
                  <Etiqueta
                    cor={
                      c.status === 'CONCLUIDA'
                        ? 'verde'
                        : c.status === 'AGENDADA'
                          ? 'petroleo'
                          : c.status === 'FALTOU'
                            ? 'ambar'
                            : 'vermelho'
                    }
                  >
                    {ROTULOS_STATUS[c.status]}
                  </Etiqueta>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
