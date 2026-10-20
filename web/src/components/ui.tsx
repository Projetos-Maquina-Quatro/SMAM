import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { useEffect } from 'react';

export const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');

/* ---------------------------------------------------------------- Botão */

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-smam-600 text-white hover:bg-smam-700 disabled:bg-smam-600/50',
  secundario:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  perigo: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
  fantasma: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-400',
};

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  carregando?: boolean;
  icone?: ReactNode;
}

export function Botao({
  variante = 'primario',
  carregando = false,
  icone,
  children,
  className,
  disabled,
  ...props
}: BotaoProps) {
  return (
    <button
      {...props}
      disabled={disabled || carregando}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
        'transition-colors disabled:cursor-not-allowed',
        VARIANTES[variante],
        className,
      )}
    >
      {carregando ? <Loader2 className="size-4 animate-spin" /> : icone}
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Campos */

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  erro?: string;
  dica?: string;
  obrigatorio?: boolean;
}

export function Campo({ rotulo, erro, dica, obrigatorio, className, ...props }: CampoProps) {
  return (
    <div className={className}>
      <label className="rotulo" htmlFor={props.id ?? props.name}>
        {rotulo}
        {obrigatorio && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        {...props}
        id={props.id ?? props.name}
        aria-invalid={!!erro}
        className={cn('campo', erro && 'campo-erro')}
      />
      {erro ? (
        <p className="mt-1 text-xs text-red-600">{erro}</p>
      ) : dica ? (
        <p className="mt-1 text-xs text-slate-500">{dica}</p>
      ) : null}
    </div>
  );
}

interface SelecaoProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo: string;
  erro?: string;
  obrigatorio?: boolean;
}

export function Selecao({ rotulo, erro, obrigatorio, className, children, ...props }: SelecaoProps) {
  return (
    <div className={className}>
      <label className="rotulo" htmlFor={props.id ?? props.name}>
        {rotulo}
        {obrigatorio && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <select
        {...props}
        id={props.id ?? props.name}
        aria-invalid={!!erro}
        className={cn('campo', erro && 'campo-erro')}
      >
        {children}
      </select>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- Avisos */

export function Alerta({
  tipo = 'erro',
  children,
}: {
  tipo?: 'erro' | 'sucesso' | 'aviso';
  children: ReactNode;
}) {
  const estilos = {
    erro: 'bg-red-50 text-red-800 border-red-200',
    sucesso: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    aviso: 'bg-amber-50 text-amber-800 border-amber-200',
  }[tipo];

  const Icone = tipo === 'sucesso' ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm', estilos)}
    >
      <Icone className="mt-px size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const CORES_ETIQUETA = {
  cinza: 'bg-slate-100 text-slate-700',
  verde: 'bg-emerald-100 text-emerald-800',
  ambar: 'bg-amber-100 text-amber-800',
  vermelho: 'bg-red-100 text-red-800',
  azul: 'bg-sky-100 text-sky-800',
  petroleo: 'bg-smam-100 text-smam-800',
} as const;

export function Etiqueta({
  cor = 'cinza',
  children,
}: {
  cor?: keyof typeof CORES_ETIQUETA;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        CORES_ETIQUETA[cor],
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- Estados */

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 className="size-4 animate-spin" />
      {texto}
    </div>
  );
}

export function EstadoVazio({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone?: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icone && <div className="text-slate-300">{icone}</div>}
      <div>
        <p className="font-medium text-slate-700">{titulo}</p>
        {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

/* ---------------------------------------------------------------- Modal */

export function Modal({
  aberto,
  titulo,
  onFechar,
  children,
  largura = 'max-w-lg',
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cn(
          'max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl',
          largura,
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5">
          <h2 className="font-semibold text-slate-800">{titulo}</h2>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Cabeçalho de página */

export function CabecalhoPagina({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
