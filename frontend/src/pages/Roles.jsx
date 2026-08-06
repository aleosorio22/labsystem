import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Button, IconButton, Card, PageHeader, Modal, Input, Checkbox, Spinner, Badge,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { errorMsg } from '../services/api';
import rolService from '../services/rolService';

export default function Roles() {
  const { can } = useAuth();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', permisos: [] });
  const [guardando, setGuardando] = useState(false);

  const { data: roles, cargando, recargar } = useFetch(() => rolService.getAll(), []);
  const { data: permisos } = useFetch(() => rolService.getPermisos(), []);

  const porModulo = useMemo(() => {
    const grupos = {};
    for (const p of permisos ?? []) (grupos[p.modulo] ??= []).push(p);
    return grupos;
  }, [permisos]);

  const abrir = (rol) => {
    setForm(rol
      ? { nombre: rol.nombre, descripcion: rol.descripcion ?? '', permisos: [...rol.permisos] }
      : { nombre: '', descripcion: '', permisos: [] });
    setModal(rol ?? {});
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (modal?.id) await rolService.update(modal.id, form);
      else await rolService.create(form);
      toast.success('Rol guardado');
      setModal(null);
      recargar();
    } catch (err) {
      toast.error(errorMsg(err));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (rol) => {
    if (!window.confirm(`¿Eliminar el rol ${rol.nombre}?`)) return;
    try {
      await rolService.eliminar(rol.id);
      toast.success('Rol eliminado');
      recargar();
    } catch (err) {
      toast.error(errorMsg(err));
    }
  };

  const togglePermiso = (id) => setForm((f) => ({
    ...f,
    permisos: f.permisos.includes(id)
      ? f.permisos.filter((x) => x !== id)
      : [...f.permisos, id],
  }));

  if (cargando) return <Spinner />;

  return (
    <>
      <PageHeader titulo="Roles y permisos" descripcion="Qué puede hacer cada tipo de usuario">
        {can('roles.editar') && (
          <Button icon="agregar" onClick={() => abrir(null)}>Nuevo rol</Button>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(roles ?? []).map((rol) => (
          <Card key={rol.id} className="p-5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h2 className="font-medium text-text">{rol.nombre}</h2>
                <p className="text-sm text-text-muted">{rol.descripcion}</p>
              </div>
              {can('roles.editar') && rol.nombre !== 'super-admin' && (
                <div className="flex gap-1 shrink-0">
                  <IconButton icon="editar" title="Editar" onClick={() => abrir(rol)} />
                  <IconButton icon="eliminar" title="Eliminar" danger onClick={() => eliminar(rol)} />
                </div>
              )}
            </div>
            <Badge color={rol.nombre === 'super-admin' ? 'success' : 'info'}>
              {rol.nombre === 'super-admin' ? 'Todos los permisos' : `${rol.permisos.length} permisos`}
            </Badge>
          </Card>
        ))}
      </div>

      <Modal
        abierto={modal !== null}
        onCerrar={() => setModal(null)}
        titulo={modal?.id ? `Editar rol — ${modal.nombre}` : 'Nuevo rol'}
        ancho="max-w-3xl"
      >
        <form onSubmit={guardar}>
          <div className="grid gap-4 sm:grid-cols-2 mb-5">
            <Input label="Nombre" value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} required />
            <Input label="Descripción" value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
          </div>

          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {Object.entries(porModulo).map(([modulo, lista]) => (
              <div key={modulo}>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-faint mb-1.5">
                  {modulo}
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {lista.map((p) => (
                    <Checkbox
                      key={p.id}
                      label={p.nombre}
                      checked={form.permisos.includes(p.id)}
                      onChange={() => togglePermiso(p.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" icon="confirmar" loading={guardando}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
