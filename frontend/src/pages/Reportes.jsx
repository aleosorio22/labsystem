import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { api } from '../lib/api';
import { Card, PageHeader, Input, Spinner, Table } from '../components/ui';

const primeroDeMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const hoy = () => new Date().toISOString().slice(0, 10);
const fmtQ = (n) => `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;

const TABS = [
  { id: 'ventas', label: 'Ventas' },
  { id: 'ganancias', label: 'Ganancias por examen' },
  { id: 'comisiones-medicos', label: 'Comisiones por médico' },
];

export default function Reportes() {
  const [tab, setTab] = useState('ventas');
  const [desde, setDesde] = useState(primeroDeMes());
  const [hasta, setHasta] = useState(hoy());

  const { data, isLoading } = useQuery({
    queryKey: ['reporte', tab, desde, hasta],
    queryFn: () => api.get(`/reportes/${tab}`, { params: { desde, hasta } }).then((r) => r.data),
  });

  return (
    <>
      <PageHeader titulo="Reportes" descripcion="Ventas, ganancias y comisiones por período" />

      <div className="flex flex-wrap gap-1 mb-4 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-3 py-2 text-sm border-b-2 -mb-px transition-colors cursor-pointer',
              tab === t.id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3 p-4 border-b border-border">
          <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          {tab === 'ventas' && data && (
            <p className="ml-auto text-sm text-text-muted">
              Total del período: <span className="font-semibold text-text">{fmtQ(data.total)}</span>
            </p>
          )}
        </div>

        {isLoading ? <Spinner /> : tab === 'ventas' ? (
          <Table
            columnas={[
              { key: 'orden', label: 'Orden', className: 'text-text-faint' },
              { key: 'fecha_cotizacion', label: 'Fecha', render: (f) => new Date(f.fecha_cotizacion).toLocaleDateString('es-GT') },
              { key: 'paciente', label: 'Paciente' },
              { key: 'medico', label: 'Médico' },
              { key: 'examen', label: 'Examen' },
              { key: 'precio', label: 'Precio', render: (f) => fmtQ(f.precio) },
            ]}
            filas={(data?.filas ?? []).map((f, i) => ({ ...f, id: i }))}
          />
        ) : tab === 'ganancias' ? (
          <Table
            columnas={[
              { key: 'examen', label: 'Examen' },
              { key: 'cantidad', label: 'Cantidad' },
              { key: 'venta', label: 'Venta', render: (f) => fmtQ(f.venta) },
              { key: 'costo_prueba', label: 'Costo prueba', render: (f) => fmtQ(f.costo_prueba) },
              { key: 'costo_insumos', label: 'Insumos', render: (f) => fmtQ(f.costo_insumos) },
              { key: 'comisiones', label: 'Comisiones', render: (f) => fmtQ(f.comisiones) },
              { key: 'ganancia', label: 'Ganancia', className: 'font-medium', render: (f) => fmtQ(f.ganancia) },
            ]}
            filas={(data?.filas ?? []).map((f, i) => ({ ...f, id: i }))}
          />
        ) : (
          <Table
            columnas={[
              { key: 'medico', label: 'Médico' },
              { key: 'ordenes', label: 'Órdenes' },
              { key: 'venta', label: 'Venta', render: (f) => fmtQ(f.venta) },
              { key: 'comision', label: 'Comisión', className: 'font-medium', render: (f) => fmtQ(f.comision) },
            ]}
            filas={(data?.filas ?? []).map((f, i) => ({ ...f, id: i }))}
          />
        )}
      </Card>
    </>
  );
}
