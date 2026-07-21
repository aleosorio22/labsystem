import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import CrudPage from '../components/CrudPage';
import { Badge } from '../components/ui';

const TIPO_COLOR = { 1: 'info', 2: 'warning', 3: 'neutral', 4: 'success', 5: 'success', 6: 'neutral' };

export default function Examenes() {
  const { data: categorias } = useQuery({
    queryKey: ['/catalogos/categorias-examen'],
    queryFn: () => api.get('/catalogos/categorias-examen').then((r) => r.data),
  });
  const { data: unidades } = useQuery({
    queryKey: ['/catalogos/unidades-medida'],
    queryFn: () => api.get('/catalogos/unidades-medida').then((r) => r.data),
  });
  const { data: tipos } = useQuery({
    queryKey: ['/catalogos/tipos-examen'],
    queryFn: () => api.get('/catalogos/tipos-examen').then((r) => r.data),
  });

  return (
    <CrudPage
      titulo="Exámenes"
      descripcion="Catálogo de exámenes, precios y valores de referencia"
      endpoint="/examenes"
      permisoBase="examenes"
      columnas={[
        { key: 'codigo', label: 'Código', className: 'text-text-faint' },
        { key: 'nombre', label: 'Examen' },
        { key: 'categoria', label: 'Categoría' },
        { key: 'tipo', label: 'Tipo', render: (e) => (
          <Badge color={TIPO_COLOR[e.tipo_examen] ?? 'neutral'}>{e.tipo?.trim()}</Badge>
        ) },
        { key: 'precio', label: 'Precio', render: (e) => `Q ${Number(e.precio).toFixed(2)}` },
      ]}
      campos={[
        { name: 'codigo', label: 'Código' },
        { name: 'nombre', label: 'Nombre' },
        {
          name: 'id_categoria', label: 'Categoría', type: 'select',
          options: (categorias ?? []).map((c) => ({ value: c.id, label: c.nombre })),
        },
        {
          name: 'tipo_examen', label: 'Tipo de examen', type: 'select',
          options: (tipos ?? []).map((t) => ({ value: t.id, label: t.nombre.trim() })),
        },
        {
          name: 'id_unidad_medida', label: 'Unidad de medida', type: 'select',
          options: (unidades ?? []).map((u) => ({ value: u.id, label: u.nombre })),
        },
        { name: 'precio', label: 'Precio (Q)', type: 'number', step: '0.01' },
        { name: 'rango_inferior', label: 'Rango inferior', type: 'number', step: '0.01' },
        { name: 'rango_superior', label: 'Rango superior', type: 'number', step: '0.01' },
        { name: 'pprueba', label: 'Costo de prueba (Q)', type: 'number', step: '0.01' },
        { name: 'insumos', label: 'Costo de insumos (Q)', type: 'number', step: '0.01' },
        { name: 'valor_deseado', label: 'Valores de referencia (se imprimen en el resultado)', type: 'textarea', span: 2 },
      ]}
      valoresIniciales={{ precio: 0, pprueba: 0, insumos: 0 }}
      transformar={(f) => ({
        ...f,
        rango_inferior: f.rango_inferior === '' ? null : f.rango_inferior,
        rango_superior: f.rango_superior === '' ? null : f.rango_superior,
      })}
    />
  );
}
