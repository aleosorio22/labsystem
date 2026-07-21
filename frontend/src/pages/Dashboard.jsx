import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Card, PageHeader, Spinner, Badge } from '../components/ui';
import { icons } from '../config/icons';
import { useAuth } from '../lib/auth';

const ESTADOS = {
  1: { label: 'Cotización', color: 'info' },
  2: { label: 'En proceso', color: 'warning' },
  3: { label: 'Finalizado', color: 'success' },
};

function Stat({ icon, label, valor, i }) {
  const Icon = icons[icon];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.2 }}
    >
      <Card className="p-4 flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-base bg-primary-soft text-primary shrink-0">
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold text-text leading-tight">{valor}</p>
          <p className="text-xs text-text-muted truncate">{label}</p>
        </div>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reportes/dashboard').then((r) => r.data),
  });

  if (isLoading) return <Spinner />;

  const fmtQ = (n) => `Q ${Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;

  return (
    <>
      <PageHeader
        titulo={`Hola, ${user?.name?.split(' ')[0]}`}
        descripcion="Resumen del laboratorio"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <Stat i={0} icon="pacientes" label="Pacientes activos" valor={data.pacientes.toLocaleString()} />
        <Stat i={1} icon="ordenes" label="Órdenes de hoy" valor={data.ordenesHoy} />
        <Stat i={2} icon="analisis" label="Análisis en proceso" valor={data.enProceso} />
        <Stat i={3} icon="finalizados" label="Finalizados hoy" valor={data.finalizadosHoy} />
        <Stat i={4} icon="reportes" label="Ventas del mes" valor={fmtQ(data.ventasMes)} />
      </div>

      <Card>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-medium text-text">Últimas órdenes</h2>
          <Link to="/ordenes" className="text-sm text-primary hover:underline">Ver todas</Link>
        </div>
        <div className="divide-y divide-border">
          {data.ultimasOrdenes.map((o) => (
            <div key={o.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-text-faint w-14 shrink-0">#{o.id}</span>
                <span className="text-text truncate">{o.paciente}</span>
              </div>
              <Badge color={ESTADOS[o.estado_documento]?.color}>
                {ESTADOS[o.estado_documento]?.label}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
