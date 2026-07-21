/**
 * Menú lateral: cada entrada declara el permiso que la habilita.
 * El layout oculta lo que el usuario no puede ver.
 */
export const NAV_SECTIONS = [
  {
    titulo: null,
    items: [
      { to: '/', label: 'Inicio', icon: 'dashboard', permiso: 'dashboard.ver' },
    ],
  },
  {
    titulo: 'Laboratorio',
    items: [
      { to: '/ordenes', label: 'Cotizaciones', icon: 'ordenes', permiso: 'ordenes.ver' },
      { to: '/analisis', label: 'Análisis en proceso', icon: 'analisis', permiso: 'resultados.ver' },
      { to: '/finalizados', label: 'Finalizados', icon: 'finalizados', permiso: 'resultados.ver' },
    ],
  },
  {
    titulo: 'Registros',
    items: [
      { to: '/pacientes', label: 'Pacientes', icon: 'pacientes', permiso: 'pacientes.ver' },
      { to: '/medicos', label: 'Médicos', icon: 'medicos', permiso: 'medicos.ver' },
      { to: '/examenes', label: 'Exámenes', icon: 'examenes', permiso: 'examenes.ver' },
      { to: '/catalogos', label: 'Catálogos', icon: 'catalogos', permiso: 'catalogos.ver' },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { to: '/reportes', label: 'Reportes', icon: 'reportes', permiso: 'reportes.ver' },
      { to: '/usuarios', label: 'Usuarios', icon: 'usuarios', permiso: 'usuarios.ver' },
      { to: '/roles', label: 'Roles y permisos', icon: 'roles', permiso: 'roles.ver' },
      { to: '/empresa', label: 'Empresa', icon: 'empresa', permiso: 'empresa.ver' },
      { to: '/bitacora', label: 'Bitácora', icon: 'bitacora', permiso: 'bitacora.ver' },
    ],
  },
];
