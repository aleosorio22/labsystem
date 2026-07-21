import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import CrudPage from '../components/CrudPage';

export default function Pacientes() {
  const { data: sexos } = useQuery({
    queryKey: ['/catalogos/sexos'],
    queryFn: () => api.get('/catalogos/sexos').then((r) => r.data),
  });

  return (
    <CrudPage
      titulo="Pacientes"
      descripcion="Registro de pacientes del laboratorio"
      endpoint="/pacientes"
      permisoBase="pacientes"
      paginado
      columnas={[
        { key: 'id', label: 'No.', className: 'text-text-faint' },
        { key: 'nombre', label: 'Paciente', render: (p) => `${p.nombres} ${p.apellidos}` },
        { key: 'sexo', label: 'Sexo' },
        { key: 'edad', label: 'Edad', render: (p) => `${p.edad} años` },
        { key: 'celular', label: 'Celular' },
        { key: 'direccion', label: 'Dirección', className: 'max-w-50 truncate' },
      ]}
      campos={[
        { name: 'nombres', label: 'Nombres' },
        { name: 'apellidos', label: 'Apellidos' },
        { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
        {
          name: 'id_sexo', label: 'Sexo', type: 'select',
          options: (sexos ?? []).map((s) => ({ value: s.id, label: s.nombre })),
        },
        { name: 'dpi', label: 'DPI' },
        { name: 'nit', label: 'NIT' },
        { name: 'celular', label: 'Celular' },
        { name: 'telefono', label: 'Teléfono' },
        { name: 'mail', label: 'Correo', type: 'email' },
        { name: 'tipo_sangre', label: 'Tipo de sangre' },
        { name: 'direccion', label: 'Dirección', span: 2 },
      ]}
      transformar={(f) => ({
        ...f,
        fecha_nacimiento: f.fecha_nacimiento?.slice(0, 10),
      })}
    />
  );
}
