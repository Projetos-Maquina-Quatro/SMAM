/** Erro de negócio com status HTTP, tratado pelo errorHandler do app. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detalhes?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const naoEncontrado = (recurso: string) =>
  new HttpError(404, `${recurso} não encontrado(a).`);

export const conflito = (mensagem: string) => new HttpError(409, mensagem);
