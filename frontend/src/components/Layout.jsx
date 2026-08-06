import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { icons } from '../config/icons';
import { NAV_SECTIONS } from '../config/nav';
import { useAuth } from '../context/AuthContext';

function ItemNav({ to, label, icon }) {
  const Icon = icons[icon];
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => clsx(
        'flex items-center gap-2.5 rounded-base px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary-soft text-primary font-medium'
          : 'text-text-muted hover:bg-bg hover:text-text',
      )}
    >
      <Icon size={17} />
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const LogoIcon = icons.laboratorio;
  const SalirIcon = icons.salir;

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border">
          <LogoIcon size={22} className="text-primary" />
          <span className="font-semibold text-text tracking-tight">LabSystem</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {NAV_SECTIONS.map((seccion, i) => {
            const visibles = seccion.items.filter((it) => can(it.permiso));
            if (!visibles.length) return null;
            return (
              <div key={i}>
                {seccion.titulo && (
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                    {seccion.titulo}
                  </p>
                )}
                <div className="space-y-0.5">
                  {visibles.map((it) => <ItemNav key={it.to} {...it} />)}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between gap-2 px-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text truncate">{user?.name}</p>
              <p className="text-xs text-text-faint truncate">{user?.rol}</p>
            </div>
            <button
              title="Cerrar sesión"
              onClick={() => { logout(); navigate('/login'); }}
              className="p-2 rounded-base text-text-faint hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer"
            >
              <SalirIcon size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6">
        <Outlet />
      </main>
    </div>
  );
}
