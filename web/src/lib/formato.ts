/** Formatação e máscaras no padrão brasileiro. */

export const mascaraCpf = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

export const mascaraTelefone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

export const mascaraCep = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');

export const mascaraCartaoSus = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 15)
    .replace(/(\d{3})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2');

const dataFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' });
const horaFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
});
const dataLongaFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export const formatarData = (iso: string | Date) => dataFmt.format(new Date(iso));
export const formatarHora = (iso: string | Date) => horaFmt.format(new Date(iso));
export const formatarDataLonga = (iso: string | Date) => dataLongaFmt.format(new Date(iso));
export const formatarDataHora = (iso: string | Date) =>
  `${formatarData(iso)} às ${formatarHora(iso)}`;

/** `2026-10-20` para usar em <input type="date"> e nas queries da API. */
export const hojeISO = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

/** Converte a data vinda da API (ISO completo) para o valor de um input date. */
export const paraInputDate = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');

export function calcularIdade(dataNasc: string | Date): number {
  const nasc = new Date(dataNasc);
  const hoje = new Date();
  let idade = hoje.getUTCFullYear() - nasc.getUTCFullYear();
  const mes = hoje.getUTCMonth() - nasc.getUTCMonth();
  if (mes < 0 || (mes === 0 && hoje.getUTCDate() < nasc.getUTCDate())) idade--;
  return idade;
}

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0];

export const iniciais = (nome: string) => {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

export const ROTULOS_SEXO = {
  MASCULINO: 'Masculino',
  FEMININO: 'Feminino',
  OUTRO: 'Outro',
} as const;

export const ROTULOS_PRIORIDADE = {
  NORMAL: 'Normal',
  PREFERENCIAL: 'Preferencial',
  URGENTE: 'Urgente',
} as const;

export const ROTULOS_STATUS = {
  AGENDADA: 'Agendada',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
  FALTOU: 'Faltou',
} as const;

export const ROTULOS_PAPEL = {
  ADMIN: 'Administrador',
  ATENDENTE: 'Atendente',
  MEDICO: 'Médico',
} as const;
