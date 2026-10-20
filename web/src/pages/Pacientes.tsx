import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pencil, Search, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  ROTULOS_SEXO,
  calcularIdade,
  formatarData,
  mascaraCartaoSus,
  mascaraCpf,
  mascaraTelefone,
} from '../lib/formato';
import type { Pagina, Paciente } from '../lib/tipos';
import { Botao, CabecalhoPagina, Carregando, EstadoVazio, Etiqueta } from '../components/ui';

export default function Pacientes() {
  const [busca, setBusca] = useState('');
  const [buscaAtiva, setBuscaAtiva] = useState('');
  const [pagina, setPagina] = useState(1);

  // Debounce: evita uma requisição por tecla digitada.
  useEffect(() => {
    const t = setTimeout(() => {
      setBuscaAtiva(busca.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [busca]);

  const { data, isPending, isFetching } = useQuery({
    queryKey: ['pacientes', { busca: buscaAtiva, pagina }],
    queryFn: () =>
      api<Pagina<Paciente>>('/pacientes', { query: { busca: buscaAtiva, pagina, porPagina: 20 } }),
    placeholderData: (anterior) => anterior,
  });

  return (
    <div>
      <CabecalhoPagina
        titulo="Pacientes"
        descricao="Cadastro e consulta dos pacientes da unidade."
        acao={
          <Link to="/pacientes/novo">
            <Botao icone={<UserPlus className="size-4" />}>Novo paciente</Botao>
          </Link>
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF ou Cartão SUS..."
          aria-label="Buscar paciente"
          className="campo pl-9"
        />
      </div>

      <div className="cartao overflow-hidden">
        {isPending ? (
          <Carregando texto="Carregando pacientes..." />
        ) : !data?.itens.length ? (
          <EstadoVazio
            icone={<Users className="size-10" />}
            titulo={buscaAtiva ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            descricao={
              buscaAtiva
                ? `Não há resultados para "${buscaAtiva}".`
                : 'Comece cadastrando o primeiro paciente da unidade.'
            }
            acao={
              !buscaAtiva && (
                <Link to="/pacientes/novo">
                  <Botao icone={<UserPlus className="size-4" />}>Cadastrar paciente</Botao>
                </Link>
              )
            }
          />
        ) : (
          <>
            {/* Tabela no desktop */}
            <table className="hidden w-full text-sm md:table">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3 font-semibold">Paciente</th>
                  <th className="px-5 py-3 font-semibold">CPF</th>
                  <th className="px-5 py-3 font-semibold">Cartão SUS</th>
                  <th className="px-5 py-3 font-semibold">Telefone</th>
                  <th className="px-5 py-3 font-semibold">Bairro</th>
                  <th className="w-12 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.itens.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        to={`/pacientes/${p.id}`}
                        className="font-medium text-slate-800 hover:text-smam-700 hover:underline"
                      >
                        {p.nome}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {ROTULOS_SEXO[p.sexo]} · {calcularIdade(p.dataNasc)} anos ·{' '}
                        {formatarData(p.dataNasc)}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-slate-600 tabular-nums">
                      {p.cpf ? mascaraCpf(p.cpf) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-600 tabular-nums">
                      {p.cartaoSus ? (
                        mascaraCartaoSus(p.cartaoSus)
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 tabular-nums">
                      {mascaraTelefone(p.telefone1)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{p.bairro}</td>
                    <td className="px-5 py-3">
                      <Link
                        to={`/pacientes/${p.id}`}
                        aria-label={`Editar ${p.nome}`}
                        className="inline-grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-smam-700"
                      >
                        <Pencil className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Cartões no celular */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.itens.map((p) => (
                <li key={p.id}>
                  <Link to={`/pacientes/${p.id}`} className="block px-4 py-3.5 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-800">{p.nome}</p>
                      <Etiqueta>{calcularIdade(p.dataNasc)} anos</Etiqueta>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 tabular-nums">
                      {p.cpf ? mascaraCpf(p.cpf) : 'CPF não informado'} ·{' '}
                      {mascaraTelefone(p.telefone1)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {p.bairro}, {p.cidade}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            {data.totalPaginas > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
                <p className="text-sm text-slate-500">
                  {data.total} paciente{data.total === 1 ? '' : 's'} · página {data.pagina} de{' '}
                  {data.totalPaginas}
                </p>
                <div className="flex gap-2">
                  <Botao
                    variante="secundario"
                    disabled={pagina <= 1 || isFetching}
                    onClick={() => setPagina((p) => p - 1)}
                    icone={<ChevronLeft className="size-4" />}
                  >
                    Anterior
                  </Botao>
                  <Botao
                    variante="secundario"
                    disabled={pagina >= data.totalPaginas || isFetching}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Próxima
                    <ChevronRight className="size-4" />
                  </Botao>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
