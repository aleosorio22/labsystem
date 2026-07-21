import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api, errorMsg, abrirPdf } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Button, IconButton, Card, PageHeader, Table, Buscador, Spinner,
  Paginacion, Badge, Modal, Input,
} from '../components/ui';

const fmtQ = (n) => `Q ${Number(n).toFixed(2)}`;
const fmtFecha = (d) => new Date(d).toLocaleDateString('es-GT');

/**
 * Listado compartido de órdenes; cambia por estado_documento:
 *  1 = Cotizaciones, 2 = Análisis en proceso, 3 = Finalizados
 */
export default function Ordenes({ estadoDocumento, titulo, descripcion }) {
  const { can } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [anular, setAnular] = useState(null); // orden a anular
  const [passwordAnular, setPasswordAnular] = useState('');

  const params = { estado_documento: estadoDocumento, page, limit: 15, q: busqueda || undefined };
  const { data, isLoading } = useQuery({
    queryKey: ['ordenes', params],
    queryFn: () => api.get('/ordenes', { params }).then((r) => r.data),
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['ordenes'] });

  const transicion = useMutation({
    mutationFn: ({ id, ruta }) => api.post(`/ordenes/${id}/${ruta}`),
    onSuccess: (_d, { msg }) => { toast.success(msg); invalidar(); },
    onError: (err) => toast.error(errorMsg(err)),
  });

  const anularMut = useMutation({
    mutationFn: ({ id, password }) => api.post(`/ordenes/${id}/anular`, { password_actual: password }),
    onSuccess: () => {
      toast.success('Orden anulada');
      setAnular(null); setPasswordAnular('');
      invalidar();
    },
    onError: (err) => toast.error(errorMsg(err)),
  });

  const whatsapp = async (id) => {
    try {
      const { data: w } = await api.get(`/ordenes/${id}/whatsapp`);
      const numero = (w.celular || '').replace(/\D/g, '');
      if (!numero) return toast.warning('El paciente no tiene celular registrado');
      window.open(`https://wa.me/502${numero}?text=${encodeURIComponent(w.mensaje)}`, '_blank');
    } catch (err) { toast.error(errorMsg(err)); }
  };

  return (
    <>
      <PageHeader titulo={titulo} descripcion={descripcion}>
        {estadoDocumento === 1 && can('ordenes.crear') && (
          <Button icon="agregar" onClick={() => navigate('/ordenes/nueva')}>Nueva orden</Button>
        )}
      </PageHeader>

      <Card>
        <div className="p-4 border-b border-border">
          <Buscador
            valor={busqueda}
            onBuscar={(v) => { setBusqueda(v); setPage(1); }}
            placeholder="Buscar por paciente o número…"
          />
        </div>

        {isLoading ? <Spinner /> : (
          <Table
            columnas={[
              { key: 'id', label: 'No.', className: 'text-text-faint' },
              { key: 'fecha_cotizacion', label: 'Fecha', render: (o) => fmtFecha(o.fecha_cotizacion) },
              { key: 'paciente', label: 'Paciente' },
              { key: 'medico', label: 'Médico' },
              { key: 'total', label: 'Total', render: (o) => fmtQ(o.total) },
            ]}
            filas={data?.data ?? []}
            renderAcciones={(o) => (
              <>
                {estadoDocumento === 1 && (
                  <>
                    <IconButton icon="documento" title="PDF de cotización"
                      onClick={() => abrirPdf(`/ordenes/${o.id}/pdf/cotizacion`)} />
                    {can('ordenes.editar') && (
                      <IconButton icon="editar" title="Editar"
                        onClick={() => navigate(`/ordenes/${o.id}/editar`)} />
                    )}
                    {can('ordenes.convertir') && (
                      <IconButton icon="avanzar" title="Pasar a análisis"
                        onClick={() => transicion.mutate({ id: o.id, ruta: 'convertir-venta', msg: 'Orden pasada a análisis' })} />
                    )}
                  </>
                )}
                {estadoDocumento === 2 && (
                  <>
                    {can('resultados.capturar') && (
                      <Link to={`/analisis/${o.id}`}>
                        <IconButton icon="analisis" title="Capturar resultados" />
                      </Link>
                    )}
                    {can('ordenes.convertir') && (
                      <IconButton icon="regresar" title="Regresar a cotización"
                        onClick={() => transicion.mutate({ id: o.id, ruta: 'regresar-cotizacion', msg: 'Orden regresada a cotización' })} />
                    )}
                  </>
                )}
                {estadoDocumento === 3 && (
                  <>
                    {can('resultados.imprimir') && (
                      <>
                        <IconButton icon="imprimir" title="PDF de resultados"
                          onClick={() => abrirPdf(`/ordenes/${o.id}/pdf/resultados`)} />
                        <IconButton icon="whatsapp" title="Avisar por WhatsApp"
                          onClick={() => whatsapp(o.id)} />
                      </>
                    )}
                    {can('resultados.reabrir') && (
                      <IconButton icon="reabrir" title="Reabrir análisis"
                        onClick={() => transicion.mutate({ id: o.id, ruta: 'reabrir', msg: 'Análisis reabierto' })} />
                    )}
                  </>
                )}
                {can('ordenes.eliminar') && (
                  <IconButton icon="eliminar" title="Anular" danger onClick={() => setAnular(o)} />
                )}
              </>
            )}
          />
        )}
        {data && <Paginacion page={data.page} pages={data.pages} onPage={setPage} />}
      </Card>

      <Modal
        abierto={!!anular}
        onCerrar={() => setAnular(null)}
        titulo={`Anular orden #${anular?.id}`}
      >
        <p className="text-sm text-text-muted mb-4">
          Por seguridad, confirma tu contraseña para anular la orden de
          <span className="font-medium text-text"> {anular?.paciente}</span>.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); anularMut.mutate({ id: anular.id, password: passwordAnular }); }}>
          <Input
            label="Tu contraseña"
            type="password"
            value={passwordAnular}
            onChange={(e) => setPasswordAnular(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-5">
            <Button type="button" variant="secondary" onClick={() => setAnular(null)}>Cancelar</Button>
            <Button type="submit" variant="danger" icon="eliminar" loading={anularMut.isPending}>
              Anular orden
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
