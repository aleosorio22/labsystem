import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Button, Card, PageHeader, Input, Select, Textarea, Spinner, Checkbox,
} from '../components/ui';
import SelectBuscador from '../components/SelectBuscador';
import PacienteNuevoModal from '../components/PacienteNuevoModal';
import { icons } from '../config/icons';

const hoy = () => new Date().toISOString().slice(0, 10);
const fmtQ = (n) => `Q ${Number(n || 0).toFixed(2)}`;

/** Hook simple de debounce para búsquedas en servidor */
function useDebounce(valor, ms = 250) {
  const [deb, setDeb] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDeb(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return deb;
}

const itemPaciente = (p) => ({
  id: p.id,
  label: `${p.nombres} ${p.apellidos}`,
  sub: [p.edad != null ? `${p.edad} años` : null, p.celular].filter(Boolean).join(' · '),
});
const itemMedico = (m) => ({ id: m.id, label: `${m.nombres} ${m.apellidos}` });

/** Crear o editar una orden (cotización) */
export default function OrdenForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const editando = !!id;

  // --- Paciente: búsqueda en servidor + creación inline ---
  const [pacienteSel, setPacienteSel] = useState(null);
  const [busqPaciente, setBusqPaciente] = useState('');
  const busqPacienteDeb = useDebounce(busqPaciente);
  const [modalPaciente, setModalPaciente] = useState(false);
  const [nombrePrellenado, setNombrePrellenado] = useState('');

  const { data: pacientesEncontrados, isFetching: buscandoPacientes } = useQuery({
    queryKey: ['pacientes-buscar', busqPacienteDeb],
    queryFn: () => api.get('/pacientes', { params: { q: busqPacienteDeb, limit: 10 } })
      .then((r) => r.data.data),
    enabled: busqPacienteDeb.length >= 2,
  });

  // --- Médicos: lista corta, filtro local ---
  const [medicoSel, setMedicoSel] = useState(null);
  const [medicoHijoSel, setMedicoHijoSel] = useState(null);
  const [filtroMedico, setFiltroMedico] = useState('');
  const [filtroMedicoHijo, setFiltroMedicoHijo] = useState('');

  const { data: medicos } = useQuery({
    queryKey: ['/medicos'],
    queryFn: () => api.get('/medicos').then((r) => r.data),
  });

  const filtrarMedicos = (texto) => (medicos ?? [])
    .filter((m) => `${m.nombres} ${m.apellidos}`.toLowerCase().includes(texto.toLowerCase()))
    .slice(0, 20)
    .map(itemMedico);

  // --- Exámenes ---
  const { data: examenes } = useQuery({
    queryKey: ['examenes-vendibles'],
    queryFn: () => api.get('/examenes/vendibles').then((r) => r.data),
  });

  const { data: orden, isLoading: cargandoOrden } = useQuery({
    queryKey: ['orden', id],
    queryFn: () => api.get(`/ordenes/${id}`).then((r) => r.data),
    enabled: editando,
  });

  const [form, setForm] = useState({
    fecha_cotizacion: hoy(), observaciones: '', comision_medico_hijo: 0, coniva: true,
  });
  const [items, setItems] = useState([]);
  const [filtroExamen, setFiltroExamen] = useState('');

  useEffect(() => {
    if (!orden) return;
    setForm({
      fecha_cotizacion: String(orden.fecha_cotizacion).slice(0, 10),
      observaciones: orden.observaciones ?? '',
      comision_medico_hijo: Number(orden.comision_medico_hijo) || 0,
      coniva: true,
    });
    setPacienteSel({ id: orden.id_paciente, label: orden.paciente, sub: `${orden.edad_paciente} años` });
    setMedicoSel({ id: orden.id_medico, label: orden.medico });
    setMedicoHijoSel(orden.id_medico_hijo ? { id: orden.id_medico_hijo, label: orden.medico_hijo } : null);
    setItems(orden.detalles.map((d) => ({
      id_examen: d.id_examen, nombre: d.examen, codigo: d.codigo,
      precio: Number(d.precio), descuento: Number(d.descuento) || 0,
      comision: Number(d.comision) || 0, cantidad: d.cantidad,
      pprueba: Number(d.pprueba) || 0, insumos: Number(d.insumos) || 0,
    })));
  }, [orden]);

  const examenesFiltrados = useMemo(() => {
    if (!filtroExamen) return [];
    const q = filtroExamen.toLowerCase();
    return (examenes ?? [])
      .filter((e) => e.nombre.toLowerCase().includes(q) || e.codigo.toLowerCase().includes(q))
      .slice(0, 8);
  }, [examenes, filtroExamen]);

  const agregarExamen = (e) => {
    if (items.some((i) => i.id_examen === e.id)) {
      toast.warning('Ese examen ya está en la orden');
      return;
    }
    setItems((arr) => [...arr, {
      id_examen: e.id, nombre: e.nombre, codigo: e.codigo,
      precio: Number(e.precio), descuento: 0, comision: 0, cantidad: 1,
      pprueba: Number(e.pprueba) || 0, insumos: Number(e.insumos) || 0,
    }]);
    setFiltroExamen('');
  };

  const total = items.reduce((s, i) => s + Number(i.precio || 0), 0);

  const guardar = useMutation({
    mutationFn: (payload) => editando
      ? api.put(`/ordenes/${id}`, payload)
      : api.post('/ordenes', payload),
    onSuccess: () => {
      toast.success(editando ? 'Orden actualizada' : 'Orden creada');
      navigate('/ordenes');
    },
    onError: (err) => toast.error(errorMsg(err)),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    if (!pacienteSel) return toast.warning('Selecciona el paciente');
    if (!medicoSel) return toast.warning('Selecciona el médico');
    if (!items.length) return toast.warning('Agrega al menos un examen');
    guardar.mutate({
      ...form,
      id_paciente: pacienteSel.id,
      id_medico: medicoSel.id,
      id_medico_hijo: medicoHijoSel?.id ?? null,
      observaciones: form.observaciones || null,
      items: items.map(({ nombre, codigo, ...i }) => i),
    });
  };

  if (editando && cargandoOrden) return <Spinner />;

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const EliminarIcon = icons.eliminar;

  return (
    <>
      <PageHeader
        titulo={editando ? `Editar orden #${id}` : 'Nueva orden'}
        descripcion="Cotización de exámenes de laboratorio"
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <Card className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectBuscador
            label="Paciente"
            required
            placeholder="Buscar por nombre, DPI o celular…"
            valor={pacienteSel}
            onSelect={setPacienteSel}
            opciones={(pacientesEncontrados ?? []).map(itemPaciente)}
            onBuscar={setBusqPaciente}
            cargando={buscandoPacientes}
            accionExtra={can('pacientes.crear') ? {
              label: 'Crear paciente nuevo',
              onClick: (texto) => { setNombrePrellenado(texto); setModalPaciente(true); },
            } : undefined}
          />
          <SelectBuscador
            label="Médico"
            required
            placeholder="Buscar médico…"
            valor={medicoSel}
            onSelect={setMedicoSel}
            opciones={filtrarMedicos(filtroMedico)}
            onBuscar={setFiltroMedico}
          />
          <Input label="Fecha" type="date" value={form.fecha_cotizacion} onChange={set('fecha_cotizacion')} required />
          <SelectBuscador
            label="Médico referente secundario (opcional)"
            placeholder="Buscar médico…"
            valor={medicoHijoSel}
            onSelect={setMedicoHijoSel}
            opciones={filtrarMedicos(filtroMedicoHijo)}
            onBuscar={setFiltroMedicoHijo}
          />
          <Select label="% comisión secundario" value={form.comision_medico_hijo} onChange={set('comision_medico_hijo')}>
            <option value={0}>0%</option>
            {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((p) => (
              <option key={p} value={p}>{p}%</option>
            ))}
          </Select>
          <div className="flex items-end pb-2">
            <Checkbox
              label="Precios con IVA"
              checked={form.coniva}
              onChange={(e) => setForm((f) => ({ ...f, coniva: e.target.checked }))}
            />
          </div>
          <Textarea label="Observaciones" value={form.observaciones} onChange={set('observaciones')} className="sm:col-span-2 lg:col-span-3" />
        </Card>

        <Card className="p-5">
          <h2 className="font-medium text-text mb-3">Exámenes</h2>

          <div className="relative mb-4">
            <Input
              placeholder="Buscar examen por nombre o código…"
              value={filtroExamen}
              onChange={(e) => setFiltroExamen(e.target.value)}
            />
            {examenesFiltrados.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-base shadow-lg overflow-hidden">
                {examenesFiltrados.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => agregarExamen(e)}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-primary-soft transition-colors cursor-pointer"
                  >
                    <span><span className="text-text-faint mr-2">{e.codigo}</span>{e.nombre}</span>
                    <span className="text-text-muted">{fmtQ(e.precio)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-text-faint py-6 text-center">
              Busca y agrega los exámenes de la orden
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="py-2 pr-3 font-medium">Examen</th>
                    <th className="py-2 px-3 font-medium w-28">Precio (Q)</th>
                    <th className="py-2 px-3 font-medium w-28">Descuento</th>
                    <th className="py-2 px-3 font-medium w-28">Comisión</th>
                    <th className="w-px" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id_examen} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3">
                        <span className="text-text-faint mr-2">{item.codigo}</span>
                        {item.nombre}
                      </td>
                      {['precio', 'descuento', 'comision'].map((campo) => (
                        <td key={campo} className="py-2 px-3">
                          <input
                            type="number" step="0.01" min="0"
                            value={item[campo]}
                            onChange={(e) => setItems((arr) => arr.map((x, i) =>
                              i === idx ? { ...x, [campo]: e.target.value } : x))}
                            className="w-24 rounded-base border border-border px-2 py-1 text-sm outline-none
                                       focus:border-primary focus:ring-1 focus:ring-primary-border"
                          />
                        </td>
                      ))}
                      <td className="py-2">
                        <button
                          type="button"
                          title="Quitar"
                          onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-base text-text-faint hover:text-danger hover:bg-danger-soft cursor-pointer"
                        >
                          <EliminarIcon size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end mt-3 text-sm">
                <span className="text-text-muted mr-2">Total:</span>
                <span className="font-semibold text-text">{fmtQ(total)}</span>
              </div>
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/ordenes')}>Cancelar</Button>
          <Button type="submit" icon="confirmar" loading={guardar.isPending}>
            {editando ? 'Guardar cambios' : 'Crear orden'}
          </Button>
        </div>
      </form>

      <PacienteNuevoModal
        abierto={modalPaciente}
        onCerrar={() => setModalPaciente(false)}
        nombreInicial={nombrePrellenado}
        onCreado={(p) => {
          setModalPaciente(false);
          setPacienteSel(itemPaciente(p));
        }}
      />
    </>
  );
}
