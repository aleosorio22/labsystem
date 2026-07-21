import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Button, IconButton, Card, PageHeader, Modal, Input, Checkbox, Spinner, Badge,
} from '../components/ui';

export default function Roles() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', permisos: [] });

  const { data: roles, isLoading } = useQuery({
    queryKey: ['/roles'],
    queryFn: () => api.get('/roles').then((r) => r.data),
  });
  const { data: permisos } = useQuery({
    queryKey: ['/roles/permisos'],
    queryFn: () => api.get('/roles/permisos').then((r) => r.data),
  });

  const porModulo = useMemo(() => {
    const grupos = {};
    for (const p of permisos ?? []) (grupos[p.modulo] ??= []).push(p);
    return grupos;
  }, [permisos]);

  const invalidar = () => qc.invalidateQueries({ queryKey: ['/roles'] });

  const guardar = useMutation({
    mutationFn: () => modal?.id
      ? api.put(`/roles/${modal.id}`, form)
      : api.post('/roles', form),
    onSuccess: () => {
      toast.success('Rol guardado');
      setModal(null);
      invalidar();
    },
    onError: (err) => toast.error(errorMsg(err)),
  });

  const eliminar = useMutation({
    mutationFn: (id) => api.delete(`/roles/${id}`),
    onSuccess: () => { toast.success('Rol eliminado'); invalidar(); },
    onError: (err) => toast.error(errorMsg(err)),
  });

  const abrir = (rol) => {
    setForm(rol
      ? { nombre: rol.nombre, descripcion: rol.descripcion ?? '', permisos: [...rol.permisos] }
      : { nombre: '', descripcion: '', permisos: [] });
    setModal(rol ?? {});
  };

  const togglePermiso = (id) => setForm((f) => ({
    ...f,
    permisos: f.permisos.includes(id)
      ? f.permisos.filter((x) => x !== id)
      : [...f.permisos, id],
  }));

  if (isLoading) return <Spinner />;

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
                  <IconButton icon="eliminar" title="Eliminar" danger
                    onClick={() => window.confirm(`¿Eliminar el rol ${rol.nombre}?`) && eliminar.mutate(rol.id)} />
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
        <form onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }}>
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
            <Button type="submit" icon="confirmar" loading={guardar.isPending}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
