import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Button, IconButton, Card, PageHeader, Modal, Table, Buscador,
  Input, Select, Textarea, Checkbox, Spinner, Paginacion,
} from './ui';

/** Renderiza un campo del formulario según su definición */
function Campo({ def, valor, onChange, error }) {
  const props = {
    label: def.label,
    value: valor ?? '',
    onChange: (e) => onChange(def.name, e.target.value),
    error,
    className: def.span === 2 ? 'sm:col-span-2' : undefined,
  };
  if (def.type === 'select') {
    return (
      <Select {...props}>
        <option value="">— Seleccionar —</option>
        {(def.options || []).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    );
  }
  if (def.type === 'textarea') return <Textarea {...props} />;
  if (def.type === 'checkbox') {
    return (
      <Checkbox
        label={def.label}
        checked={!!valor}
        onChange={(e) => onChange(def.name, e.target.checked)}
        className={def.span === 2 ? 'sm:col-span-2' : undefined}
      />
    );
  }
  return <Input type={def.type || 'text'} step={def.step} {...props} />;
}

/**
 * Página CRUD genérica: lista + búsqueda + modal crear/editar + eliminar.
 *
 * props:
 *  - titulo, descripcion, endpoint (p.ej. '/pacientes')
 *  - columnas: [{key,label,render?}]
 *  - campos: definiciones del formulario
 *  - permisoBase: 'pacientes' → usa pacientes.crear/editar/eliminar
 *  - paginado: true si el endpoint devuelve {data,total,page,pages}
 *  - transformar: (form) => payload antes de enviar
 */
export default function CrudPage({
  titulo, descripcion, endpoint, columnas, campos,
  permisoBase, paginado = false, transformar = (f) => f, valoresIniciales = {},
}) {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | {} (nuevo) | fila (editar)
  const [form, setForm] = useState({});
  const [errores, setErrores] = useState({});

  const params = useMemo(() => {
    const p = {};
    if (busqueda) p.q = busqueda;
    if (paginado) { p.page = page; p.limit = 15; }
    return p;
  }, [busqueda, page, paginado]);

  const { data, isLoading } = useQuery({
    queryKey: [endpoint, params],
    queryFn: () => api.get(endpoint, { params }).then((r) => r.data),
  });

  const filas = paginado ? (data?.data ?? []) : (data ?? []);

  const invalidar = () => qc.invalidateQueries({ queryKey: [endpoint] });

  const guardar = useMutation({
    mutationFn: (payload) => modal?.id
      ? api.put(`${endpoint}/${modal.id}`, payload)
      : api.post(endpoint, payload),
    onSuccess: () => {
      toast.success(modal?.id ? 'Registro actualizado' : 'Registro creado');
      setModal(null);
      invalidar();
    },
    onError: (err) => {
      const detalles = err.response?.data?.details;
      if (detalles?.length) {
        setErrores(Object.fromEntries(detalles.map((d) => [d.campo, d.mensaje])));
      }
      toast.error(errorMsg(err));
    },
  });

  const eliminar = useMutation({
    mutationFn: (id) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => { toast.success('Registro eliminado'); invalidar(); },
    onError: (err) => toast.error(errorMsg(err)),
  });

  const abrirModal = (fila) => {
    setErrores({});
    setForm(fila?.id ? { ...fila } : { ...valoresIniciales });
    setModal(fila ?? {});
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setErrores({});
    const payload = {};
    for (const def of campos) payload[def.name] = form[def.name] ?? null;
    guardar.mutate(transformar(payload));
  };

  return (
    <>
      <PageHeader titulo={titulo} descripcion={descripcion}>
        {can(`${permisoBase}.crear`) && (
          <Button icon="agregar" onClick={() => abrirModal(null)}>Nuevo</Button>
        )}
      </PageHeader>

      <Card>
        <div className="p-4 border-b border-border">
          <Buscador valor={busqueda} onBuscar={(v) => { setBusqueda(v); setPage(1); }} />
        </div>

        {isLoading ? <Spinner /> : (
          <Table
            columnas={columnas}
            filas={filas}
            renderAcciones={(fila) => (
              <>
                {can(`${permisoBase}.editar`) && (
                  <IconButton icon="editar" title="Editar" onClick={() => abrirModal(fila)} />
                )}
                {can(`${permisoBase}.eliminar`) && (
                  <IconButton
                    icon="eliminar" title="Eliminar" danger
                    onClick={() => window.confirm('¿Eliminar este registro?') && eliminar.mutate(fila.id)}
                  />
                )}
              </>
            )}
          />
        )}

        {paginado && data && (
          <Paginacion page={data.page} pages={data.pages} onPage={setPage} />
        )}
      </Card>

      <Modal
        abierto={modal !== null}
        onCerrar={() => setModal(null)}
        titulo={modal?.id ? `Editar — ${titulo}` : `Nuevo — ${titulo}`}
        ancho="max-w-2xl"
      >
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            {campos.map((def) => (
              <Campo
                key={def.name}
                def={def}
                valor={form[def.name]}
                error={errores[def.name]}
                onChange={(name, valor) => setForm((f) => ({ ...f, [name]: valor }))}
              />
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
