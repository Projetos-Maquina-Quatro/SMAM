export type Papel = 'ADMIN' | 'ATENDENTE' | 'MEDICO';
export type Sexo = 'MASCULINO' | 'FEMININO' | 'OUTRO';
export type Prioridade = 'NORMAL' | 'PREFERENCIAL' | 'URGENTE';
export type StatusConsulta = 'AGENDADA' | 'CONCLUIDA' | 'CANCELADA' | 'FALTOU';

export interface Usuario {
  id: number;
  login: string;
  nome: string;
  papel: Papel;
}

export interface Paciente {
  id: number;
  nome: string;
  cpf: string | null;
  rg: string | null;
  cartaoSus: string | null;
  sexo: Sexo;
  dataNasc: string;
  nomeResponsavel: string | null;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string | null;
  telefone1: string;
  telefone2: string | null;
  email: string | null;
  observacoes: string | null;
  ativo: boolean;
  criadoEm: string;
}

export interface Especialidade {
  id: number;
  nome: string;
  ativo: boolean;
  _count?: { medicos: number };
}

export interface Medico {
  id: number;
  crm: string;
  nome: string;
  ativo: boolean;
  funcionarioId: number;
  especialidadeId: number;
  especialidade: Especialidade;
  contato: { email: string | null; telefone: string };
}

export interface Funcionario {
  id: number;
  nome: string;
  cpf: string;
  cargo: string;
  sexo: Sexo;
  dataNasc: string;
  telefone1: string;
  email: string | null;
  ativo: boolean;
  usuario: { id: number; login: string; papel: Papel; ativo: boolean } | null;
  medico: { id: number; crm: string; especialidade: Especialidade } | null;
}

export interface Consulta {
  id: number;
  dataHora: string;
  prioridade: Prioridade;
  status: StatusConsulta;
  observacoes: string | null;
  pacienteId: number;
  medicoId: number;
  especialidadeId: number;
  paciente: {
    id: number;
    nome: string;
    cartaoSus: string | null;
    telefone1: string;
    dataNasc: string;
  };
  especialidade: Especialidade;
  medico: { id: number; crm: string; funcionario: { nome: string } };
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export interface ResumoDia {
  data: string;
  agendadas: number;
  concluidas: number;
  canceladas: number;
  urgentes: number;
  pacientesAtivos: number;
}
