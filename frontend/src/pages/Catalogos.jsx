import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { api } from '../lib/api';
import CrudPage from '../components/CrudPage';

const TABS = [
  { id: 'sexos', label: 'Sexos', endpoint: '/catalogos/sexos' },
  { id: 'unidades', label: 'Unidades de medida', endpoint: '/catalogos/unidades-medida' },
  { id: 'cat-examen', label: 'Categorías de examen', endpoint: '/catalogos/categorias-examen', conOrden: true },
  { id: 'palabras', label: 'Palabras cualitativas', endpoint: '/catalogos/palabras-cualitativo' },
  { id: 'cat-heces', label: 'Categorías de heces', endpoint: '/catalogos/categorias-heces', conOrden: true },
  { id: 'par-heces', label: 'Parámetros de heces', endpoint: '/catalogos/parametros-heces', padre: { endpoint: '/catalogos/categorias-heces', campo: 'categoria_heces_id' } },
  { id: 'cat-orina', label: 'Categorías de orina', endpoint: '/catalogos/categorias-orina', conOrden: true },
  { id: 'par-orina', label: 'Parámetros de orina', endpoint: '/catalogos/parametros-orina', padre: { endpoint: '/catalogos/categorias-orina', campo: 'categoria_orina_id' } },
];

export default function Catalogos() {
  const [tab, setTab] = useState(TABS[0]);

  const { data: padres } = useQuery({
    queryKey: [tab.padre?.endpoint ?? 'sin-padre'],
    queryFn: () => api.get(tab.padre.endpoint).then((r) => r.data),
    enabled: !!tab.padre,
  });

  const columnas = [
    { key: 'id', label: 'No.', className: 'text-text-faint' },
    { key: 'nombre', label: 'Nombre' },
  ];
  const campos = [{ name: 'nombre', label: 'Nombre', span: 2 }];

  if (tab.conOrden) {
    columnas.push({ key: 'orden', label: 'Orden' });
    campos.push({ name: 'orden', label: 'Orden de impresión', type: 'number' });
  }
  if (tab.padre) {
    columnas.splice(1, 0, {
      key: tab.padre.campo, label: 'Categoría',
      render: (f) => padres?.find((p) => p.id === f[tab.padre.campo])?.nombre ?? f[tab.padre.campo],
    });
    campos.unshift({
      name: tab.padre.campo, label: 'Categoría', type: 'select',
      options: (padres ?? []).map((p) => ({ value: p.id, label: p.nombre })),
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-5 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t)}
            className={clsx(
              'px-3 py-2 text-sm rounded-t-base border-b-2 -mb-px transition-colors cursor-pointer',
              tab.id === t.id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <CrudPage
        key={tab.id}
        titulo={tab.label}
        endpoint={tab.endpoint}
        permisoBase="catalogos"
        columnas={columnas}
        campos={campos}
      />
    </div>
  );
}
