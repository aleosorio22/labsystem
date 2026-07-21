import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, PageHeader, Spinner, Table, Paginacion, Badge } from '../components/ui';

const COLOR_ACCION = {
  'Creación': 'success',
  'Edición': 'info',
  'Eliminación': 'danger',
  'Anulación': 'danger',
  'Login': 'neutral',
};

export default function Bitacora() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['bitacora', page],
    queryFn: () => api.get('/bitacora', { params: { page, limit: 25 } }).then((r) => r.data),
  });

  return (
    <>
      <PageHeader titulo="Bitácora" descripcion="Registro de todas las acciones del sistema" />
      <Card>
        {isLoading ? <Spinner /> : (
          <Table
            columnas={[
              { key: 'created_at', label: 'Fecha', className: 'whitespace-nowrap text-text-muted',
                render: (b) => new Date(b.created_at).toLocaleString('es-GT') },
              { key: 'usuario', label: 'Usuario', render: (b) => b.usuario ?? '—' },
              { key: 'accion', label: 'Acción',
                render: (b) => <Badge color={COLOR_ACCION[b.accion] ?? 'neutral'}>{b.accion}</Badge> },
              { key: 'nombre_tabla', label: 'Módulo' },
              { key: 'registro_id', label: 'Registro', className: 'text-text-faint' },
            ]}
            filas={data?.data ?? []}
          />
        )}
        {data && <Paginacion page={data.page} pages={data.pages} onPage={setPage} />}
      </Card>
    </>
  );
}
