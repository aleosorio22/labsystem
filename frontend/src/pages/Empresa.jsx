import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, PageHeader, Input, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { errorMsg } from '../services/api';
import empresaService from '../services/empresaService';

const CAMPOS = [
  ['nombre_comercial', 'Nombre comercial'],
  ['nombre_contable', 'Nombre contable'],
  ['nit', 'NIT'],
  ['no_patente', 'No. de patente'],
  ['telefonos', 'Teléfonos'],
  ['email', 'Correo'],
  ['direccion', 'Dirección'],
];

export default function Empresa() {
  const { can } = useAuth();
  const { data, cargando } = useFetch(() => empresaService.get(), []);
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await empresaService.update(Object.fromEntries(CAMPOS.map(([k]) => [k, form[k] ?? null])));
      toast.success('Datos de la empresa actualizados');
    } catch (err) {
      toast.error(errorMsg(err));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <Spinner />;

  return (
    <>
      <PageHeader
        titulo="Empresa"
        descripcion="Datos que aparecen en cotizaciones y resultados impresos"
      />
      <Card className="p-5 max-w-2xl">
        <form onSubmit={guardar}>
          <div className="grid gap-4 sm:grid-cols-2">
            {CAMPOS.map(([campo, label]) => (
              <Input
                key={campo}
                label={label}
                value={form[campo] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                className={campo === 'direccion' ? 'sm:col-span-2' : undefined}
                disabled={!can('empresa.editar')}
              />
            ))}
          </div>
          {can('empresa.editar') && (
            <div className="flex justify-end mt-6">
              <Button type="submit" icon="confirmar" loading={guardando}>Guardar</Button>
            </div>
          )}
        </form>
      </Card>
    </>
  );
}
