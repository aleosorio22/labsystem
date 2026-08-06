import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMsg } from '../services/api';

/**
 * Carga datos de un service y expone { data, cargando, error, recargar }.
 *
 * - `fn` es la función que hace la petición (normalmente un método de un service).
 * - `deps` son las dependencias que, al cambiar, vuelven a disparar la carga.
 * - `opciones.activo` permite postergar la carga (p.ej. hasta que haya un id).
 * - `opciones.inicial` es el valor de `data` mientras no hay respuesta.
 *
 *   const { data: pacientes, cargando, recargar } = useFetch(
 *     () => pacienteService.getAll({ q }), [q],
 *   );
 */
export function useFetch(fn, deps = [], { activo = true, inicial = null } = {}) {
  const [data, setData] = useState(inicial);
  const [cargando, setCargando] = useState(activo);
  const [error, setError] = useState(null);

  // Guarda la última petición lanzada para descartar respuestas fuera de orden
  const peticionRef = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const cargar = useCallback(async () => {
    if (!activo) { setCargando(false); return; }
    const idPeticion = ++peticionRef.current;
    setCargando(true);
    setError(null);
    try {
      const resultado = await fnRef.current();
      if (idPeticion === peticionRef.current) setData(resultado);
    } catch (err) {
      if (idPeticion === peticionRef.current) setError(errorMsg(err));
    } finally {
      if (idPeticion === peticionRef.current) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, ...deps]);

  useEffect(() => { cargar(); }, [cargar]);

  return { data, cargando, error, recargar: cargar, setData };
}
