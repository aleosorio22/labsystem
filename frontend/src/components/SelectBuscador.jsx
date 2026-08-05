import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { icons } from '../config/icons';

/**
 * Combobox con buscador: reemplaza al <select> nativo.
 *
 * props:
 *  - label, placeholder, required
 *  - valor: item seleccionado ({ id, label, sub? }) o null
 *  - onSelect(item|null)
 *  - opciones: lista visible según la búsqueda
 *  - onBuscar(texto): notifica cambios del texto de búsqueda (para búsqueda en servidor)
 *  - cargando: muestra indicador mientras llegan resultados
 *  - accionExtra: { label, onClick } → botón fijo al pie de la lista (p.ej. crear paciente)
 */
export default function SelectBuscador({
  label, placeholder = 'Buscar…', required, valor, onSelect,
  opciones = [], onBuscar, cargando = false, accionExtra, className,
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const contRef = useRef(null);
  const inputRef = useRef(null);

  const BuscarIcon = icons.buscar;
  const CerrarIcon = icons.cerrar;
  const AbajoIcon = icons.siguiente;
  const CargandoIcon = icons.cargando;
  const AgregarIcon = icons.agregar;

  // Cierra al hacer clic fuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const onClick = (e) => {
      if (!contRef.current?.contains(e.target)) setAbierto(false);
    };
    const onKey = (e) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [abierto]);

  useEffect(() => {
    if (abierto) {
      setTexto('');
      onBuscar?.('');
      // espera al render del dropdown
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const elegir = (item) => {
    onSelect(item);
    setAbierto(false);
  };

  return (
    <div className={clsx('relative', className)} ref={contRef}>
      {label && (
        <span className="block text-sm font-medium text-text-muted mb-1">
          {label}{required && <span className="text-danger"> *</span>}
        </span>
      )}

      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className={clsx(
          'flex w-full items-center justify-between gap-2 rounded-base border bg-surface px-3 py-2',
          'text-sm text-left outline-none transition-colors cursor-pointer',
          'focus:border-primary focus:ring-2 focus:ring-primary-border',
          abierto ? 'border-primary ring-2 ring-primary-border' : 'border-border',
        )}
      >
        {valor ? (
          <span className="truncate text-text">{valor.label}</span>
        ) : (
          <span className="truncate text-text-faint">{placeholder}</span>
        )}
        <span className="flex items-center gap-1 shrink-0">
          {valor && (
            <span
              role="button"
              title="Limpiar"
              onClick={(e) => { e.stopPropagation(); onSelect(null); }}
              className="p-0.5 rounded text-text-faint hover:text-danger cursor-pointer"
            >
              <CerrarIcon size={14} />
            </span>
          )}
          <AbajoIcon size={15} className={clsx('text-text-faint transition-transform', abierto && 'rotate-90')} />
        </span>
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-base border border-border bg-surface shadow-lg"
          >
            <div className="relative border-b border-border">
              <BuscarIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                ref={inputRef}
                value={texto}
                onChange={(e) => { setTexto(e.target.value); onBuscar?.(e.target.value); }}
                placeholder="Escribe para buscar…"
                className="w-full bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none"
              />
              {cargando && (
                <CargandoIcon size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" />
              )}
            </div>

            <ul className="max-h-56 overflow-y-auto py-1">
              {opciones.length === 0 && !cargando && (
                <li className="px-3 py-4 text-center text-sm text-text-faint">
                  {texto ? 'Sin resultados' : 'Escribe para buscar'}
                </li>
              )}
              {opciones.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => elegir(item)}
                    className={clsx(
                      'flex w-full flex-col items-start px-3 py-2 text-sm transition-colors cursor-pointer',
                      valor?.id === item.id ? 'bg-primary-soft text-primary' : 'hover:bg-bg',
                    )}
                  >
                    <span className="text-text">{item.label}</span>
                    {item.sub && <span className="text-xs text-text-faint">{item.sub}</span>}
                  </button>
                </li>
              ))}
            </ul>

            {accionExtra && (
              <button
                type="button"
                onClick={() => { setAbierto(false); accionExtra.onClick(texto); }}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm
                           font-medium text-primary hover:bg-primary-soft transition-colors cursor-pointer"
              >
                <AgregarIcon size={15} />
                {accionExtra.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
