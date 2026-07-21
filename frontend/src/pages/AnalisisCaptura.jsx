import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMsg, abrirPdf } from '../lib/api';
import { Button, Card, PageHeader, Spinner, Select, Badge } from '../components/ui';

/**
 * Captura de resultados de un análisis en proceso.
 * Tipos de examen: 1 numérico, 2 positivo/negativo, 3 tecleado,
 * 4 heces (formulario propio), 5 orina (formulario propio), 6 estático.
 */
export default function AnalisisCaptura() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: orden, isLoading } = useQuery({
    queryKey: ['orden', id],
    queryFn: () => api.get(`/ordenes/${id}`).then((r) => r.data),
  });
  const { data: catHeces } = useQuery({
    queryKey: ['/catalogos/categorias-heces'],
    queryFn: () => api.get('/catalogos/categorias-heces').then((r) => r.data),
  });
  const { data: parHeces } = useQuery({
    queryKey: ['/catalogos/parametros-heces'],
    queryFn: () => api.get('/catalogos/parametros-heces').then((r) => r.data),
  });
  const { data: catOrina } = useQuery({
    queryKey: ['/catalogos/categorias-orina'],
    queryFn: () => api.get('/catalogos/categorias-orina').then((r) => r.data),
  });
  const { data: parOrina } = useQuery({
    queryKey: ['/catalogos/parametros-orina'],
    queryFn: () => api.get('/catalogos/parametros-orina').then((r) => r.data),
  });

  const [resultados, setResultados] = useState({});   // id_detalle -> texto
  const [heces, setHeces] = useState({});             // id_categoria -> id_parametro
  const [orina, setOrina] = useState({});             // id_categoria -> id_parametro

  useEffect(() => {
    if (!orden) return;
    setResultados(Object.fromEntries(
      orden.detalles.map((d) => [d.id, d.resultado?.trim() ?? ''])));
    setHeces(Object.fromEntries(
      (orden.resultado_heces ?? []).map((r) => [r.id_categoria_heces, r.id_parametro_heces])));
    setOrina(Object.fromEntries(
      (orden.resultado_orina ?? []).map((r) => [r.id_categoria_orina, r.id_parametro_orina])));
  }, [orden]);

  const tieneHeces = orden?.detalles.some((d) => Number(d.tipo_examen) === 4);
  const tieneOrina = orden?.detalles.some((d) => Number(d.tipo_examen) === 5);
  const detallesCaptura = (orden?.detalles ?? [])
    .filter((d) => ![4, 5].includes(Number(d.tipo_examen)));

  const guardar = useMutation({
    mutationFn: async () => {
      await api.post(`/ordenes/${id}/resultados`, {
        resultados: Object.entries(resultados).map(([idDetalle, r]) => ({
          id_detalle: +idDetalle, resultado: r,
        })),
      });
      if (tieneHeces) {
        await api.post(`/ordenes/${id}/resultados-heces`, {
          filas: Object.entries(heces)
            .filter(([, p]) => p)
            .map(([cat, p]) => ({ id_categoria_heces: +cat, id_parametro_heces: +p })),
        });
      }
      if (tieneOrina) {
        await api.post(`/ordenes/${id}/resultados-orina`, {
          filas: Object.entries(orina)
            .filter(([, p]) => p)
            .map(([cat, p]) => ({ id_categoria_orina: +cat, id_parametro_orina: +p })),
        });
      }
    },
    onSuccess: () => {
      toast.success('Resultados guardados');
      qc.invalidateQueries({ queryKey: ['orden', id] });
    },
    onError: (err) => toast.error(errorMsg(err)),
  });

  const finalizar = useMutation({
    mutationFn: async () => {
      await guardar.mutateAsync();
      await api.post(`/ordenes/${id}/finalizar`);
    },
    onSuccess: () => {
      toast.success('Análisis finalizado');
      navigate('/finalizados');
    },
    onError: (err) => toast.error(errorMsg(err)),
  });

  if (isLoading || !orden) return <Spinner />;

  const fueraDeRango = (d) => {
    if (Number(d.tipo_examen) !== 1) return false;
    const v = parseFloat(resultados[d.id]);
    if (Number.isNaN(v)) return false;
    const inf = d.rango_inferior != null ? Number(d.rango_inferior) : null;
    const sup = d.rango_superior != null ? Number(d.rango_superior) : null;
    return (inf != null && v < inf) || (sup != null && v > sup);
  };

  const SeccionParametros = ({ titulo, categorias, parametros, estado, setEstado, campoCat }) => (
    <Card className="p-5">
      <h2 className="font-medium text-text mb-4">{titulo}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(categorias ?? []).map((cat) => (
          <Select
            key={cat.id}
            label={cat.nombre}
            value={estado[cat.id] ?? ''}
            onChange={(e) => setEstado((s) => ({ ...s, [cat.id]: e.target.value }))}
          >
            <option value="">—</option>
            {(parametros ?? [])
              .filter((p) => p[campoCat] === cat.id)
              .map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        ))}
      </div>
    </Card>
  );

  return (
    <>
      <PageHeader
        titulo={`Análisis #${orden.id} — ${orden.paciente}`}
        descripcion={`${orden.edad_paciente} años · Médico: ${orden.medico}`}
      >
        <Button variant="secondary" icon="imprimir" onClick={() => abrirPdf(`/ordenes/${id}/pdf/resultados`)}>
          Vista previa
        </Button>
        <Button variant="secondary" icon="confirmar" loading={guardar.isPending} onClick={() => guardar.mutate()}>
          Guardar avance
        </Button>
        <Button icon="finalizados" loading={finalizar.isPending}
          onClick={() => window.confirm('¿Finalizar el análisis? Ya no podrá editarse sin reabrirlo.') && finalizar.mutate()}>
          Finalizar análisis
        </Button>
      </PageHeader>

      <div className="space-y-5">
        {detallesCaptura.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="px-4 py-2.5 font-medium">Examen</th>
                    <th className="px-4 py-2.5 font-medium w-56">Resultado</th>
                    <th className="px-4 py-2.5 font-medium">Unidad</th>
                    <th className="px-4 py-2.5 font-medium">Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {detallesCaptura.map((d) => {
                    const tipo = Number(d.tipo_examen);
                    return (
                      <tr key={d.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5">
                          <span className="text-text-faint mr-2">{d.codigo}</span>{d.examen}
                          {fueraDeRango(d) && (
                            <Badge color="danger">Fuera de rango</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {tipo === 2 ? (
                            <select
                              value={resultados[d.id] ?? ''}
                              onChange={(e) => setResultados((r) => ({ ...r, [d.id]: e.target.value }))}
                              className="w-full rounded-base border border-border px-2 py-1.5 text-sm outline-none
                                         focus:border-primary focus:ring-1 focus:ring-primary-border"
                            >
                              <option value="">—</option>
                              <option value="NEGATIVO">NEGATIVO</option>
                              <option value="POSITIVO">POSITIVO</option>
                            </select>
                          ) : tipo === 3 ? (
                            <textarea
                              rows={2}
                              value={resultados[d.id] ?? ''}
                              onChange={(e) => setResultados((r) => ({ ...r, [d.id]: e.target.value }))}
                              className="w-full rounded-base border border-border px-2 py-1.5 text-sm outline-none
                                         focus:border-primary focus:ring-1 focus:ring-primary-border"
                            />
                          ) : (
                            <input
                              type={tipo === 1 ? 'number' : 'text'}
                              step="any"
                              value={resultados[d.id] ?? ''}
                              onChange={(e) => setResultados((r) => ({ ...r, [d.id]: e.target.value }))}
                              className="w-full rounded-base border border-border px-2 py-1.5 text-sm outline-none
                                         focus:border-primary focus:ring-1 focus:ring-primary-border"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-text-muted">{tipo === 1 ? d.unidad_medida : ''}</td>
                        <td className="px-4 py-2.5 text-text-muted max-w-60">
                          {tipo === 1 && (d.rango_inferior != null || d.rango_superior != null)
                            ? `${d.rango_inferior ?? ''} – ${d.rango_superior ?? ''}`
                            : <span className="line-clamp-2 whitespace-pre-line">{d.valor_deseado}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tieneHeces && (
          <SeccionParametros
            titulo="Examen de heces"
            categorias={catHeces} parametros={parHeces}
            estado={heces} setEstado={setHeces}
            campoCat="categoria_heces_id"
          />
        )}

        {tieneOrina && (
          <SeccionParametros
            titulo="Examen de orina"
            categorias={catOrina} parametros={parOrina}
            estado={orina} setEstado={setOrina}
            campoCat="categoria_orina_id"
          />
        )}
      </div>
    </>
  );
}
