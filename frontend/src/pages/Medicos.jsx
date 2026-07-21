import CrudPage from '../components/CrudPage';
import { Badge } from '../components/ui';

export default function Medicos() {
  return (
    <CrudPage
      titulo="Médicos"
      descripcion="Médicos referentes y socios"
      endpoint="/medicos"
      permisoBase="medicos"
      columnas={[
        { key: 'id', label: 'No.', className: 'text-text-faint' },
        { key: 'nombre', label: 'Médico', render: (m) => `${m.nombres} ${m.apellidos}` },
        { key: 'celular', label: 'Celular' },
        { key: 'porcentaje', label: '% Comisión', render: (m) => `${m.porcentaje}%` },
        { key: 'socio', label: 'Socio', render: (m) => m.socio
          ? <Badge color="success">Socio</Badge> : <Badge color="neutral">Referente</Badge> },
      ]}
      campos={[
        { name: 'nombres', label: 'Nombres' },
        { name: 'apellidos', label: 'Apellidos' },
        { name: 'celular', label: 'Celular' },
        { name: 'telefono', label: 'Teléfono' },
        { name: 'mail', label: 'Correo', type: 'email' },
        { name: 'no_cuenta', label: 'No. de cuenta' },
        { name: 'porcentaje', label: '% de comisión', type: 'number' },
        { name: 'comision', label: 'Comisión fija', type: 'number' },
        { name: 'direccion', label: 'Dirección', span: 2 },
        { name: 'socio', label: 'Es socio del laboratorio', type: 'checkbox', span: 2 },
      ]}
      valoresIniciales={{ porcentaje: 0, comision: 0 }}
    />
  );
}
