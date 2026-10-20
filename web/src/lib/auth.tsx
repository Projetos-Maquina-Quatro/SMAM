import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, api, tokenStore } from './api';
import type { Papel, Usuario } from './tipos';

interface AuthContexto {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (login: string, senha: string) => Promise<void>;
  sair: () => void;
  temPapel: (...papeis: Papel[]) => boolean;
}

const Contexto = createContext<AuthContexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Revalida o token guardado no localStorage ao abrir o app.
  useEffect(() => {
    if (!tokenStore.get()) {
      setCarregando(false);
      return;
    }

    let ativo = true;
    api<{ usuario: Usuario }>('/auth/me')
      .then((r) => ativo && setUsuario(r.usuario))
      .catch(() => {
        tokenStore.limpar();
        if (ativo) setUsuario(null);
      })
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, []);

  const entrar = useCallback(async (login: string, senha: string) => {
    const r = await api<{ token: string; usuario: Usuario }>('/auth/login', {
      method: 'POST',
      body: { login, senha },
    });
    tokenStore.set(r.token);
    setUsuario(r.usuario);
  }, []);

  const sair = useCallback(() => {
    tokenStore.limpar();
    setUsuario(null);
  }, []);

  const valor = useMemo<AuthContexto>(
    () => ({
      usuario,
      carregando,
      entrar,
      sair,
      temPapel: (...papeis) => !!usuario && papeis.includes(usuario.papel),
    }),
    [usuario, carregando, entrar, sair],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}

/** Deslogado quando a API devolve 401 em qualquer ponto do app. */
export function useExpiracaoDeSessao() {
  const { sair, usuario } = useAuth();

  useEffect(() => {
    if (!usuario) return;
    const aoErro = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof ApiError && e.reason.status === 401) sair();
    };
    window.addEventListener('unhandledrejection', aoErro);
    return () => window.removeEventListener('unhandledrejection', aoErro);
  }, [sair, usuario]);
}
