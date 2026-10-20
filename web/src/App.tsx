import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { Carregando } from './components/ui';
import { useAuth } from './lib/auth';
import type { Papel } from './lib/tipos';
import Agenda from './pages/Agenda';
import Especialidades from './pages/Especialidades';
import Funcionarios from './pages/Funcionarios';
import Login from './pages/Login';
import MarcarConsulta from './pages/MarcarConsulta';
import Medicos from './pages/Medicos';
import PacienteForm from './pages/PacienteForm';
import Pacientes from './pages/Pacientes';
import Painel from './pages/Painel';

function Protegido({ papeis, children }: { papeis?: Papel[]; children: React.ReactNode }) {
  const { usuario, carregando } = useAuth();

  if (carregando) return <Carregando texto="Verificando sessão..." />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (papeis && !papeis.includes(usuario.papel)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <Protegido>
            <Layout />
          </Protegido>
        }
      >
        <Route index element={<Painel />} />

        <Route path="pacientes" element={<Pacientes />} />
        <Route path="pacientes/novo" element={<PacienteForm />} />
        <Route path="pacientes/:id" element={<PacienteForm />} />

        <Route path="consultas" element={<Agenda />} />
        <Route path="consultas/nova" element={<MarcarConsulta />} />

        <Route path="especialidades" element={<Especialidades />} />
        <Route path="medicos" element={<Medicos />} />

        <Route
          path="funcionarios"
          element={
            <Protegido papeis={['ADMIN']}>
              <Funcionarios />
            </Protegido>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
