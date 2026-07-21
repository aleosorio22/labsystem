/**
 * Iconos del sistema (lucide-react), centralizados por nombre semántico.
 * Para cambiar un icono en toda la app basta con cambiarlo aquí.
 */
import {
  LayoutDashboard, Users, Stethoscope, FlaskConical, ClipboardList,
  Microscope, FileCheck2, BarChart3, UserCog, ShieldCheck, Building2,
  ScrollText, BookOpen, LogOut, Plus, Pencil, Trash2, Search, X,
  Check, ChevronLeft, ChevronRight, FileText, Printer, MessageCircle,
  ArrowRightCircle, ArrowLeftCircle, RotateCcw, Eye, KeyRound,
  AlertTriangle, Loader2, Menu, TestTubes, Beaker, Droplets,
} from 'lucide-react';

export const icons = {
  // Navegación
  dashboard: LayoutDashboard,
  pacientes: Users,
  medicos: Stethoscope,
  examenes: FlaskConical,
  catalogos: BookOpen,
  ordenes: ClipboardList,
  analisis: Microscope,
  finalizados: FileCheck2,
  reportes: BarChart3,
  usuarios: UserCog,
  roles: ShieldCheck,
  empresa: Building2,
  bitacora: ScrollText,

  // Acciones
  salir: LogOut,
  agregar: Plus,
  editar: Pencil,
  eliminar: Trash2,
  buscar: Search,
  cerrar: X,
  confirmar: Check,
  anterior: ChevronLeft,
  siguiente: ChevronRight,
  documento: FileText,
  imprimir: Printer,
  whatsapp: MessageCircle,
  avanzar: ArrowRightCircle,
  regresar: ArrowLeftCircle,
  reabrir: RotateCcw,
  ver: Eye,
  password: KeyRound,
  alerta: AlertTriangle,
  cargando: Loader2,
  menu: Menu,

  // Dominio
  laboratorio: TestTubes,
  heces: Beaker,
  orina: Droplets,
};
