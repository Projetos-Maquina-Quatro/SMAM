import { ZodIssueCode, z } from 'zod';

/**
 * Traduz as mensagens padrão do Zod. As mensagens escritas à mão nos schemas
 * têm precedência; este mapa só cobre o que não foi customizado.
 */
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') {
        return { message: 'Campo obrigatório.' };
      }
      return { message: `Tipo inválido: esperado ${issue.expected}.` };

    case ZodIssueCode.invalid_enum_value:
      return { message: `Valor inválido. Opções: ${issue.options.join(', ')}.` };

    case ZodIssueCode.invalid_date:
      return { message: 'Data inválida.' };

    case ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'E-mail inválido.' };
      return { message: 'Formato inválido.' };

    case ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return issue.minimum === 1
          ? { message: 'Campo obrigatório.' }
          : { message: `Mínimo de ${issue.minimum} caracteres.` };
      }
      return { message: `Valor mínimo: ${issue.minimum}.` };

    case ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: `Máximo de ${issue.maximum} caracteres.` };
      }
      return { message: `Valor máximo: ${issue.maximum}.` };

    default:
      return { message: ctx.defaultError };
  }
});
