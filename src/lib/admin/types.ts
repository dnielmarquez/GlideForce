// ─── Core entities ────────────────────────────────────────────────────────

export interface Instructor {
  id: number;
  name: string;
  specialty: string;
  initials: string;
  color: string;
}

export interface ClassColor {
  key: string;
  label: string;
  bg: string;
  text: string;
  border: string;
  hex: string;
}

export interface GFClass {
  id: string;
  title: string;
  description?: string;
  instructor: number;
  time: string;
  duration: number;
  date: string; // ISO date string: YYYY-MM-DD
  color: string; // key from CLASS_COLORS
  capacity: number;
  enrolled: number;
  recurring?: boolean;
}

export interface ClassFormData {
  title: string;
  description: string;
  instructorId: number | null;
  time: string;
  duration: string;
  capacity: string;
  startDate: string;
  endDate: string;
  selectedDays: number[]; // 0=Sun … 6=Sat
  isRecurring: boolean;
  excludeHolidays: boolean;
  color: string;
}

// ─── Members ──────────────────────────────────────────────────────────────

export type MemberStatus = 'activa' | 'inactiva';

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  stars: number;
  avatar: null;
  initials: string;
  color: string;
  joined: string; // YYYY-MM-DD
  status: MemberStatus;
}

export interface MemberFormData {
  name: string;
  email: string;
  phone: string;
  stars: number;
  status: MemberStatus;
}

export interface ClassHistoryItem {
  id: string;
  title: string;
  instructor: string;
  date: string;
  time: string;
  status: 'completada' | 'cancelada';
  stars: number;
}

export interface UpcomingClass {
  title: string;
  instructor: string;
  date: string;
  time: string;
  machine: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────

export interface AdminSettings {
  cancelDays: number;
  waitlistHours: number;
  waitlistMinutes: number;
  machines: number;
  studioName: string;
  contactEmail: string;
  currency: string;
  timezone: string;
  bookingOpen: boolean;
  waitlistEnabled: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
}

// ─── UI ───────────────────────────────────────────────────────────────────

export interface ToastState {
  show: boolean;
  msg: string;
}

export interface EventPopupData {
  event: GFClass;
  pos: { x: number; y: number };
}
