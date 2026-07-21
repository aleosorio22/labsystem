import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, PageHeader, Input, Spinner } from '../components/ui';

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
  const { data, isLoading } = useQuery({
    queryKey: ['/empresa'],
    queryFn: () => api.get('/empresa').then((r) => r.data),
  });
  const [form, setForm] = useState({});

  useEffect(() => { if (data) setForm(data); }, [data]);

  const guardar = useMutation({
    mutationFn: () => api.put('/empresa', Object.fromEntries(
      CAMPOS.map(([k]) => [k, form[k] ?? null]))),
    onSuccess: () => toast.success('Datos de la empresa actualizados'),
    onError: (err) => toast.error(errorMsg(err)),
  });

  if (isLoading) return <Spinner />;

  return (
    <>
      <PageHeader
        titulo="Empresa"
        descripcion="Datos que aparecen en cotizaciones y resultados impresos"
      />
      <Card className="p-5 max-w-2xl">
        <form onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }}>
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
              <Button type="submit" icon="confirmar" loading={guardar.isPending}>Guardar</Button>
            </div>
          )}
        </form>
      </Card>
    </>
  );
}
