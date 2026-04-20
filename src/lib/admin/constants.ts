import type { ClassColor, Instructor } from './types';

export const INSTRUCTORS: Instructor[] = [
  { id: 1, name: 'Tania Janek',   specialty: 'HIIT · Yoga Flow',       initials: 'TJ', color: '#E8682A' },
  { id: 2, name: 'María López',   specialty: 'Pilates · Stretching',   initials: 'ML', color: '#0F8B76' },
  { id: 3, name: 'Carlos Ruiz',   specialty: 'Funcional · Crossfit',   initials: 'CR', color: '#6D37C4' },
  { id: 4, name: 'Laura Gómez',   specialty: 'Yoga · Meditación',      initials: 'LG', color: '#2563EB' },
];

export const CLASS_COLORS: ClassColor[] = [
  { key: 'orange', label: 'Naranja', bg: '#FDF0E8', text: '#E8682A', border: '#E8682A', hex: '#E8682A' },
  { key: 'teal',   label: 'Verde',   bg: '#E6F7F4', text: '#0F8B76', border: '#0F8B76', hex: '#0F8B76' },
  { key: 'purple', label: 'Morado',  bg: '#EFE9FD', text: '#6D37C4', border: '#6D37C4', hex: '#6D37C4' },
  { key: 'blue',   label: 'Azul',    bg: '#E8F1FD', text: '#2563EB', border: '#2563EB', hex: '#2563EB' },
  { key: 'rose',   label: 'Rosa',    bg: '#FDE8F0', text: '#C4376D', border: '#C4376D', hex: '#C4376D' },
];

export const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DAYS_FULL    = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MONTH_NAMES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Colombian public holidays 2026
export const HOLIDAYS_2026 = new Set([
  '2026-01-01','2026-01-12','2026-03-23','2026-04-02','2026-04-03',
  '2026-05-01','2026-05-18','2026-06-08','2026-06-29','2026-07-20',
  '2026-08-07','2026-08-17','2026-10-12','2026-11-02','2026-11-16',
  '2026-12-08','2026-12-25',
]);

export const DEFAULT_SETTINGS = {
  cancelDays: 2,
  waitlistHours: 1,
  waitlistMinutes: 30,
  machines: 5,
  studioName: 'GlideForce Fitness Studio',
  contactEmail: 'admin@glideforce.com',
  currency: 'COP',
  timezone: 'America/Bogota',
  bookingOpen: true,
  waitlistEnabled: true,
  notifyEmail: true,
  notifyPush: true,
};

export const ADMIN_NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',     icon: 'home',     href: '/admin' },
  { id: 'calendar',    label: 'Calendario',    icon: 'calendar', href: '/admin' },
  { id: 'classes',     label: 'Clases',        icon: 'dumbbell', href: '/admin' },
] as const;

export const ADMIN_MANAGE_ITEMS = [
  { id: 'instructors', label: 'Profesoras',    icon: 'users',    href: '/admin/instructors' },
  { id: 'members',     label: 'Miembros',      icon: 'star',     href: '/admin/members' },
  { id: 'settings',    label: 'Configuración', icon: 'settings', href: '/admin/settings' },
] as const;
