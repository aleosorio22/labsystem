import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMsg } from '../lib/api';
import { Button, Input, Modal, Select } from './ui';

const VACIO = {
  nombres: '', apellidos: '', fecha_nacimiento: '', id_sexo: '',
  dpi: '', nit: '', celular: '', telefono: '', mail: '', tipo_sangre: '', direccion: '',
};

/**
 * Modal para crear un paciente sin salir del flujo actual
 * (p.ej. desde el formulario de una orden). Llama onCreado(paciente).
 */
export default function PacienteNuevoModal({ abierto, onCerrar, onCreado, nombreInicial = '' }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});

  const { data: sexos } = useQuery({
    queryKey: ['/catalogos/sexos'],
    queryFn: () => api.get('/catalogos/sexos').then((r) => r.data),
    enabled: abierto,
  });

  useEffect(() => {
    if (abierto) {
      setErrores({});
      setForm({ ...VACIO, nombres: nombreInicial });
    }
  }, [abierto, nombreInicial]);

  const crear = useMutation({
    mutationFn: () => api.post('/pacientes', {
      ...form,
      mail: form.mail || null,
    }).then((r) => r.data),
    onSuccess: (paciente) => {
      toast.success('Paciente creado');
      qc.invalidateQueries({ queryKey: ['/pacientes'] });
      onCreado(paciente);
    },
    onError: (err) => {
      const detalles = err.response?.data?.details;
      if (detalles?.length) {
        setErrores(Object.fromEntries(detalles.map((d) => [d.campo, d.mensaje])));
      }
      toast.error(errorMsg(err));
    },
  });

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nuevo paciente" ancho="max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); crear.mutate(); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombres" value={form.nombres} onChange={set('nombres')} error={errores.nombres} autoFocus required />
          <Input label="Apellidos" value={form.apellidos} onChange={set('apellidos')} error={errores.apellidos} required />
          <Input label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} error={errores.fecha_nacimiento} required />
          <Select label="Sexo" value={form.id_sexo} onChange={set('id_sexo')} error={errores.id_sexo} required>
            <option value="">— Seleccionar —</option>
            {(sexos ?? []).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Select>
          <Input label="Celular" value={form.celular} onChange={set('celular')} error={errores.celular} />
          <Input label="Teléfono" value={form.telefono} onChange={set('telefono')} error={errores.telefono} />
          <Input label="DPI" value={form.dpi} onChange={set('dpi')} error={errores.dpi} />
          <Input label="NIT" value={form.nit} onChange={set('nit')} error={errores.nit} />
          <Input label="Correo" type="email" value={form.mail} onChange={set('mail')} error={errores.mail} />
          <Input label="Tipo de sangre" value={form.tipo_sangre} onChange={set('tipo_sangre')} error={errores.tipo_sangre} />
          <Input label="Dirección" value={form.direccion} onChange={set('direccion')} error={errores.direccion} className="sm:col-span-2" />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" icon="confirmar" loading={crear.isPending}>Crear paciente</Button>
        </div>
      </form>
    </Modal>
  );
}
