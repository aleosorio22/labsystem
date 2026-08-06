import { useState } from 'react';
import clsx from 'clsx';
import CrudPage from '../components/CrudPage';
import { useFetch } from '../hooks/useFetch';
import catalogoService from '../services/catalogoService';

const TABS = [
  { id: 'sexos', label: 'Sexos' },
  { id: 'unidades-medida', label: 'Unidades de medida' },
  { id: 'categorias-examen', label: 'Categorías de examen', conOrden: true },
  { id: 'palabras-cualitativo', label: 'Palabras cualitativas' },
  { id: 'categorias-heces', label: 'Categorías de heces', conOrden: true },
  { id: 'parametros-heces', label: 'Parámetros de heces', padre: { catalogo: 'categorias-heces', campo: 'categoria_heces_id' } },
  { id: 'categorias-orina', label: 'Categorías de orina', conOrden: true },
  { id: 'parametros-orina', label: 'Parámetros de orina', padre: { catalogo: 'categorias-orina', campo: 'categoria_orina_id' } },
];

export default function Catalogos() {
  const [tab, setTab] = useState(TABS[0]);

  const { data: padres } = useFetch(
    () => catalogoService.getAll(tab.padre.catalogo),
    [tab.id],
    { activo: !!tab.padre },
  );

  const service = {
    listar: (params) => catalogoService.getAll(tab.id, params),
    crear: (payload) => catalogoService.create(tab.id, payload),
    actualizar: (id, payload) => catalogoService.update(tab.id, id, payload),
    eliminar: (id) => catalogoService.eliminar(tab.id, id),
  };

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
        service={service}
        permisoBase="catalogos"
        columnas={columnas}
        campos={campos}
      />
    </div>
  );
}
