const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3333').replace(/\/$/, '');
const CHAVE_TOKEN = 'smam.token';

export interface ErroCampo {
  campo: string;
  mensagem: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly campos?: ErroCampo[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(CHAVE_TOKEN),
  set: (token: string) => localStorage.setItem(CHAVE_TOKEN, token),
  limpar: () => localStorage.removeItem(CHAVE_TOKEN),
};

type Opcoes = Omit<RequestInit, 'body'> & { body?: unknown; query?: Record<string, unknown> };

export async function api<T>(caminho: string, { body, query, ...init }: Opcoes = {}): Promise<T> {
  const url = new URL(BASE_URL + caminho);
  for (const [chave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(chave, String(valor));
    }
  }

  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      ...init,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível falar com o servidor. Verifique sua conexão.');
  }

  if (resposta.status === 204) return undefined as T;

  const texto = await resposta.text();
  const dados = texto ? safeJson(texto) : null;

  if (!resposta.ok) {
    // Token expirado: limpa a sessão para o app devolver o usuário ao login.
    if (resposta.status === 401) tokenStore.limpar();

    throw new ApiError(
      resposta.status,
      dados?.erro ?? `Falha na requisição (HTTP ${resposta.status}).`,
      dados?.campos,
    );
  }

  return dados as T;
}

function safeJson(texto: string): any {
  try {
    return JSON.parse(texto);
  } catch {
    return { erro: texto.slice(0, 200) };
  }
}
