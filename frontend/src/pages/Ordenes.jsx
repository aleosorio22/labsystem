import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button, IconButton, Card, PageHeader, Table, Buscador, Spinner,
  Paginacion, Modal, Input,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { errorMsg } from '../services/api';
import ordenService from '../services/ordenService';

const fmtQ = (n) => `Q ${Number(n).toFixed(2)}`;
const fmtFecha = (d) => new Date(d).toLocaleDateString('es-GT');

/**
 * Listado compartido de órdenes; cambia por estado_documento:
 *  1 = Cotizaciones, 2 = Análisis en proceso, 3 = Finalizados
 */
export default function Ordenes({ estadoDocumento, titulo, descripcion }) {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [anular, setAnular] = useState(null); // orden a anular
  const [passwordAnular, setPasswordAnular] = useState('');
  const [anulando, setAnulando] = useState(false);

  const { data, cargando, recargar } = useFetch(
    () => ordenService.getAll({
      estado_documento: estadoDocumento,
      page,
      limit: 15,
      q: busqueda || undefined,
    }),
    [estadoDocumento, page, busqueda],
  );

  const transicion = async (fn, id, msg) => {
    try {
      await fn(id);
      toast.success(msg);
      recargar();
    } catch (err) {
      toast.error(errorMsg(err));
    }
  };

  const confirmarAnular = async (e) => {
    e.preventDefault();
    setAnulando(true);
    try {
      await ordenService.anular(anular.id, passwordAnular);
      toast.success('Orden anulada');
      setAnular(null);
      setPasswordAnular('');
      recargar();
    } catch (err) {
      toast.error(errorMsg(err));
    } finally {
      setAnulando(false);
    }
  };

  const whatsapp = async (id) => {
    try {
      const w = await ordenService.getWhatsapp(id);
      const numero = (w.celular || '').replace(/\D/g, '');
      if (!numero) return toast.warning('El paciente no tiene celular registrado');
      window.open(`https://wa.me/502${numero}?text=${encodeURIComponent(w.mensaje)}`, '_blank');
    } catch (err) {
      toast.error(errorMsg(err));
    }
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

        {cargando ? <Spinner /> : (
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
                      onClick={() => ordenService.abrirPdfCotizacion(o.id)} />
                    {can('ordenes.editar') && (
                      <IconButton icon="editar" title="Editar"
                        onClick={() => navigate(`/ordenes/${o.id}/editar`)} />
                    )}
                    {can('ordenes.convertir') && (
                      <IconButton icon="avanzar" title="Pasar a análisis"
                        onClick={() => transicion(ordenService.convertirAVenta, o.id, 'Orden pasada a análisis')} />
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
                        onClick={() => transicion(ordenService.regresarACotizacion, o.id, 'Orden regresada a cotización')} />
                    )}
                  </>
                )}
                {estadoDocumento === 3 && (
                  <>
                    {can('resultados.imprimir') && (
                      <>
                        <IconButton icon="imprimir" title="PDF de resultados"
                          onClick={() => ordenService.abrirPdfResultados(o.id)} />
                        <IconButton icon="whatsapp" title="Avisar por WhatsApp"
                          onClick={() => whatsapp(o.id)} />
                      </>
                    )}
                    {can('resultados.reabrir') && (
                      <IconButton icon="reabrir" title="Reabrir análisis"
                        onClick={() => transicion(ordenService.reabrir, o.id, 'Análisis reabierto')} />
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
        <form onSubmit={confirmarAnular}>
          <Input
            label="Tu contraseña"
            type="password"
            value={passwordAnular}
            onChange={(e) => setPasswordAnular(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-5">
            <Button type="button" variant="secondary" onClick={() => setAnular(null)}>Cancelar</Button>
            <Button type="submit" variant="danger" icon="eliminar" loading={anulando}>
              Anular orden
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
