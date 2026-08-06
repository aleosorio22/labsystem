import CrudPage from '../components/CrudPage';
import { Badge } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import rolService from '../services/rolService';
import userService from '../services/userService';

const service = {
  listar: () => userService.getAll(),
  crear: (payload) => userService.create(payload),
  actualizar: (id, payload) => userService.update(id, payload),
  eliminar: (id) => userService.desactivar(id),
};

export default function Usuarios() {
  const { data: roles } = useFetch(() => rolService.getAll(), []);

  return (
    <CrudPage
      titulo="Usuarios"
      descripcion="Cuentas de acceso al sistema"
      service={service}
      permisoBase="usuarios"
      columnas={[
        { key: 'name', label: 'Nombre' },
        { key: 'username', label: 'Usuario' },
        { key: 'email', label: 'Correo' },
        { key: 'rol', label: 'Rol', render: (u) => <Badge>{u.rol ?? 'Sin rol'}</Badge> },
        { key: 'active', label: 'Estado', render: (u) => u.active
          ? <Badge color="success">Activo</Badge> : <Badge color="danger">Inactivo</Badge> },
      ]}
      campos={[
        { name: 'name', label: 'Nombre completo' },
        { name: 'username', label: 'Usuario' },
        { name: 'email', label: 'Correo', type: 'email' },
        {
          name: 'role_id', label: 'Rol', type: 'select',
          options: (roles ?? []).map((r) => ({ value: r.id, label: r.nombre })),
        },
        { name: 'password', label: 'Contraseña (dejar vacío para no cambiarla)', type: 'password', span: 2 },
        { name: 'active', label: 'Usuario activo', type: 'checkbox', span: 2 },
      ]}
      valoresIniciales={{ active: true }}
      transformar={(f) => {
        const payload = { ...f, active: !!f.active };
        if (!payload.password) delete payload.password;
        return payload;
      }}
    />
  );
}
