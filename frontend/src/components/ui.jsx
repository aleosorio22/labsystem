import { forwardRef } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { icons } from '../config/icons';

/* ---------- Botones ---------- */
const variantes = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-surface text-text border border-border hover:bg-bg',
  danger: 'bg-danger text-white hover:opacity-90',
  ghost: 'text-text-muted hover:bg-bg hover:text-text',
};

export function Button({ variant = 'primary', icon, children, className, loading, ...props }) {
  const Icon = loading ? icons.cargando : icons[icon];
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-2 rounded-base px-3.5 py-2 text-sm font-medium',
        'transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        variantes[variant], className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {Icon && <Icon size={16} className={clsx(loading && 'animate-spin')} />}
      {children}
    </button>
  );
}

export function IconButton({ icon, title, className, danger, ...props }) {
  const Icon = icons[icon];
  return (
    <button
      title={title}
      className={clsx(
        'p-1.5 rounded-base transition-colors cursor-pointer',
        danger ? 'text-text-faint hover:text-danger hover:bg-danger-soft'
               : 'text-text-faint hover:text-primary hover:bg-primary-soft',
        className,
      )}
      {...props}
    >
      <Icon size={16} />
    </button>
  );
}

/* ---------- Campos de formulario ---------- */
export const Input = forwardRef(function Input({ label, error, className, ...props }, ref) {
  return (
    <label className={clsx('block', className)}>
      {label && <span className="block text-sm font-medium text-text-muted mb-1">{label}</span>}
      <input
        ref={ref}
        className={clsx(
          'w-full rounded-base border bg-surface px-3 py-2 text-sm outline-none transition-colors',
          'focus:border-primary focus:ring-2 focus:ring-primary-border',
          error ? 'border-danger' : 'border-border',
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger mt-0.5 block">{error}</span>}
    </label>
  );
});

export const Select = forwardRef(function Select({ label, error, children, className, ...props }, ref) {
  return (
    <label className={clsx('block', className)}>
      {label && <span className="block text-sm font-medium text-text-muted mb-1">{label}</span>}
      <select
        ref={ref}
        className={clsx(
          'w-full rounded-base border bg-surface px-3 py-2 text-sm outline-none transition-colors',
          'focus:border-primary focus:ring-2 focus:ring-primary-border',
          error ? 'border-danger' : 'border-border',
        )}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-danger mt-0.5 block">{error}</span>}
    </label>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, className, ...props }, ref) {
  return (
    <label className={clsx('block', className)}>
      {label && <span className="block text-sm font-medium text-text-muted mb-1">{label}</span>}
      <textarea
        ref={ref}
        rows={3}
        className={clsx(
          'w-full rounded-base border bg-surface px-3 py-2 text-sm outline-none transition-colors',
          'focus:border-primary focus:ring-2 focus:ring-primary-border',
          error ? 'border-danger' : 'border-border',
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger mt-0.5 block">{error}</span>}
    </label>
  );
});

export function Checkbox({ label, className, ...props }) {
  return (
    <label className={clsx('inline-flex items-center gap-2 cursor-pointer select-none', className)}>
      <input type="checkbox" className="size-4 accent-(--t-color-primary)" {...props} />
      <span className="text-sm text-text">{label}</span>
    </label>
  );
}

/* ---------- Superficies ---------- */
export function Card({ children, className }) {
  return (
    <div className={clsx('bg-surface border border-border rounded-lg shadow-xs', className)}>
      {children}
    </div>
  );
}

export function PageHeader({ titulo, descripcion, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-semibold text-text">{titulo}</h1>
        {descripcion && <p className="text-sm text-text-muted mt-0.5">{descripcion}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ abierto, onCerrar, titulo, children, ancho = 'max-w-lg' }) {
  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-14"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
        >
          <motion.div
            className={clsx('w-full bg-surface rounded-lg shadow-xl border border-border', ancho)}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="font-semibold text-text">{titulo}</h2>
              <IconButton icon="cerrar" title="Cerrar" onClick={onCerrar} />
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Tabla ---------- */
export function Table({ columnas, filas, vacio = 'Sin registros', renderAcciones }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {columnas.map((c) => (
              <th key={c.key} className={clsx('px-4 py-2.5 font-medium text-text-muted whitespace-nowrap', c.className)}>
                {c.label}
              </th>
            ))}
            {renderAcciones && <th className="px-4 py-2.5 w-px" />}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={columnas.length + (renderAcciones ? 1 : 0)}
                  className="px-4 py-10 text-center text-text-faint">
                {vacio}
              </td>
            </tr>
          )}
          {filas.map((fila) => (
            <tr key={fila.id} className="border-b border-border last:border-0 hover:bg-bg/60 transition-colors">
              {columnas.map((c) => (
                <td key={c.key} className={clsx('px-4 py-2.5', c.className)}>
                  {c.render ? c.render(fila) : fila[c.key]}
                </td>
              ))}
              {renderAcciones && (
                <td className="px-4 py-2.5">
                  <div className="flex gap-1 justify-end">{renderAcciones(fila)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Paginacion({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border text-sm">
      <span className="text-text-muted">Página {page} de {pages}</span>
      <IconButton icon="anterior" title="Anterior" disabled={page <= 1} onClick={() => onPage(page - 1)} />
      <IconButton icon="siguiente" title="Siguiente" disabled={page >= pages} onClick={() => onPage(page + 1)} />
    </div>
  );
}

/* ---------- Varios ---------- */
export function Badge({ color = 'info', children }) {
  const estilos = {
    info: 'bg-info-soft text-info',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    neutral: 'bg-bg text-text-muted',
  };
  return (
    <span className={clsx('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', estilos[color])}>
      {children}
    </span>
  );
}

export function Spinner({ className }) {
  const Icon = icons.cargando;
  return (
    <div className={clsx('flex justify-center py-10', className)}>
      <Icon className="animate-spin text-primary" size={28} />
    </div>
  );
}

export function Buscador({ valor, onBuscar, placeholder = 'Buscar…' }) {
  const Icon = icons.buscar;
  return (
    <div className="relative">
      <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
      <input
        value={valor}
        onChange={(e) => onBuscar(e.target.value)}
        placeholder={placeholder}
        className="w-64 rounded-base border border-border bg-surface pl-9 pr-3 py-2 text-sm outline-none
                   focus:border-primary focus:ring-2 focus:ring-primary-border transition-colors"
      />
    </div>
  );
}
