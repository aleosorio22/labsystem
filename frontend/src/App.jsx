import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import { Spinner } from './components/ui';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import Medicos from './pages/Medicos';
import Examenes from './pages/Examenes';
import Catalogos from './pages/Catalogos';
import Ordenes from './pages/Ordenes';
import OrdenForm from './pages/OrdenForm';
import AnalisisCaptura from './pages/AnalisisCaptura';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';
import Roles from './pages/Roles';
import Empresa from './pages/Empresa';
import Bitacora from './pages/Bitacora';

function Protegido({ permiso, children }) {
  const { user, cargando, can } = useAuth();
  if (cargando) return <Spinner className="min-h-screen items-center" />;
  if (!user) return <Navigate to="/login" replace />;
  if (permiso && !can(permiso)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<Protegido><Layout /></Protegido>}>
          <Route index element={<Dashboard />} />

          <Route path="ordenes" element={<Protegido permiso="ordenes.ver">
            <Ordenes estadoDocumento={1} titulo="Cotizaciones"
              descripcion="Órdenes pendientes de convertirse en venta" /></Protegido>} />
          <Route path="ordenes/nueva" element={<Protegido permiso="ordenes.crear"><OrdenForm /></Protegido>} />
          <Route path="ordenes/:id/editar" element={<Protegido permiso="ordenes.editar"><OrdenForm /></Protegido>} />

          <Route path="analisis" element={<Protegido permiso="resultados.ver">
            <Ordenes estadoDocumento={2} titulo="Análisis en proceso"
              descripcion="Ventas con resultados pendientes de captura" /></Protegido>} />
          <Route path="analisis/:id" element={<Protegido permiso="resultados.capturar"><AnalisisCaptura /></Protegido>} />

          <Route path="finalizados" element={<Protegido permiso="resultados.ver">
            <Ordenes estadoDocumento={3} titulo="Análisis finalizados"
              descripcion="Resultados listos para imprimir y entregar" /></Protegido>} />

          <Route path="pacientes" element={<Protegido permiso="pacientes.ver"><Pacientes /></Protegido>} />
          <Route path="medicos" element={<Protegido permiso="medicos.ver"><Medicos /></Protegido>} />
          <Route path="examenes" element={<Protegido permiso="examenes.ver"><Examenes /></Protegido>} />
          <Route path="catalogos" element={<Protegido permiso="catalogos.ver"><Catalogos /></Protegido>} />

          <Route path="reportes" element={<Protegido permiso="reportes.ver"><Reportes /></Protegido>} />
          <Route path="usuarios" element={<Protegido permiso="usuarios.ver"><Usuarios /></Protegido>} />
          <Route path="roles" element={<Protegido permiso="roles.ver"><Roles /></Protegido>} />
          <Route path="empresa" element={<Protegido permiso="empresa.ver"><Empresa /></Protegido>} />
          <Route path="bitacora" element={<Protegido permiso="bitacora.ver"><Bitacora /></Protegido>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
