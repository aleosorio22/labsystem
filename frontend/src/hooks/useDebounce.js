import { useEffect, useState } from 'react';

/** Retrasa el valor para no disparar una búsqueda en cada tecla */
export function useDebounce(valor, ms = 250) {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);

  return debounced;
}
