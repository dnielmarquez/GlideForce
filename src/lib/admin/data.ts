import type { GFClass, Member, ClassHistoryItem, UpcomingClass } from './types';

// ─── Seed classes ──────────────────────────────────────────────────────────

export const seedClasses: GFClass[] = (() => {
  const today = new Date('2026-04-20');
  const classes: GFClass[] = [];
  const week = [-2, -1, 0, 1, 2, 3, 4];

  week.forEach((offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const ds = d.toISOString().split('T')[0];
    const dow = d.getDay();

    if ([1, 3, 5].includes(dow)) {
      classes.push({ id: `seed-${ds}-1`, title: 'HIIT Burn', instructor: 1, time: '10:00', duration: 45, date: ds, color: 'orange', capacity: 12, enrolled: dow === 1 ? 8 : 5, recurring: true, description: 'Entrenamiento de alta intensidad.' });
    }
    if ([2, 4].includes(dow)) {
      classes.push({ id: `seed-${ds}-2`, title: 'Yoga Flow', instructor: 1, time: '08:00', duration: 60, date: ds, color: 'teal', capacity: 10, enrolled: 7, recurring: true, description: 'Yoga vinyasa al ritmo de la respiración.' });
    }
    if ([1, 4].includes(dow)) {
      classes.push({ id: `seed-${ds}-3`, title: 'Pilates Core', instructor: 2, time: '17:00', duration: 50, date: ds, color: 'purple', capacity: 8, enrolled: 6, recurring: true, description: 'Fortalecimiento de core con Pilates.' });
    }
    if ([3].includes(dow)) {
      classes.push({ id: `seed-${ds}-4`, title: 'Funcional', instructor: 3, time: '07:00', duration: 45, date: ds, color: 'blue', capacity: 15, enrolled: 10, recurring: true, description: 'Entrenamiento funcional de fuerza.' });
    }
  });

  return classes;
})();

// ─── Seed members ──────────────────────────────────────────────────────────

export const SEED_MEMBERS: Member[] = [
  { id: '1', name: 'Valentina Torres',  email: 'vale@gmail.com',            phone: '+57 311 234 5678', stars: 18, avatar: null, initials: 'VT', color: '#E8682A', joined: '2025-08-14', status: 'activa' },
  { id: '2', name: 'Camila Restrepo',   email: 'camila.r@hotmail.com',      phone: '+57 300 876 5432', stars: 7,  avatar: null, initials: 'CR', color: '#0F8B76', joined: '2025-11-03', status: 'activa' },
  { id: '3', name: 'Luciana Martínez',  email: 'luma@gmail.com',            phone: '+57 315 000 1122', stars: 32, avatar: null, initials: 'LM', color: '#6D37C4', joined: '2025-06-20', status: 'activa' },
  { id: '4', name: 'Daniela Ospina',    email: 'dani.ospina@empresa.com',   phone: '+57 320 555 9988', stars: 3,  avatar: null, initials: 'DO', color: '#2563EB', joined: '2026-01-08', status: 'activa' },
  { id: '5', name: 'Sofía Herrera',     email: 'sofi.h@gmail.com',          phone: '+57 310 444 7766', stars: 0,  avatar: null, initials: 'SH', color: '#C4376D', joined: '2026-02-15', status: 'inactiva' },
  { id: '6', name: 'Isabella Gómez',    email: 'isa.gomez@gmail.com',       phone: '+57 312 678 9900', stars: 24, avatar: null, initials: 'IG', color: '#E8682A', joined: '2025-09-01', status: 'activa' },
  { id: '7', name: 'Mariana Cárdenas',  email: 'mari.c@outlook.com',        phone: '+57 317 333 4455', stars: 11, avatar: null, initials: 'MC', color: '#0F8B76', joined: '2025-12-20', status: 'activa' },
  { id: '8', name: 'Ana Lucía Pérez',   email: 'analucia@gmail.com',        phone: '+57 301 789 2233', stars: 5,  avatar: null, initials: 'AP', color: '#6D37C4', joined: '2026-03-10', status: 'activa' },
];

export const MEMBER_HISTORY: Record<string, ClassHistoryItem[]> = {
  '1': [
    { id: 'h1',  title: 'HIIT Burn',    instructor: 'Tania Janek',  date: '2026-04-18', time: '10:00', status: 'completada', stars: 1 },
    { id: 'h2',  title: 'Yoga Flow',    instructor: 'Tania Janek',  date: '2026-04-15', time: '08:00', status: 'completada', stars: 1 },
    { id: 'h3',  title: 'Pilates Core', instructor: 'María López',  date: '2026-04-10', time: '17:00', status: 'cancelada',  stars: 0 },
    { id: 'h4',  title: 'HIIT Burn',    instructor: 'Tania Janek',  date: '2026-04-07', time: '10:00', status: 'completada', stars: 1 },
  ],
  '2': [
    { id: 'h5',  title: 'Yoga Flow',    instructor: 'Tania Janek',  date: '2026-04-16', time: '08:00', status: 'completada', stars: 1 },
    { id: 'h6',  title: 'HIIT Burn',    instructor: 'Tania Janek',  date: '2026-04-14', time: '10:00', status: 'cancelada',  stars: 0 },
  ],
  '3': [
    { id: 'h7',  title: 'Funcional',    instructor: 'Carlos Ruiz',  date: '2026-04-19', time: '07:00', status: 'completada', stars: 1 },
    { id: 'h8',  title: 'Pilates Core', instructor: 'María López',  date: '2026-04-17', time: '17:00', status: 'completada', stars: 1 },
    { id: 'h9',  title: 'Yoga Flow',    instructor: 'Tania Janek',  date: '2026-04-15', time: '08:00', status: 'completada', stars: 1 },
    { id: 'h10', title: 'HIIT Burn',    instructor: 'Tania Janek',  date: '2026-04-11', time: '10:00', status: 'completada', stars: 1 },
    { id: 'h11', title: 'Funcional',    instructor: 'Carlos Ruiz',  date: '2026-04-08', time: '07:00', status: 'completada', stars: 1 },
  ],
  '4': [], '5': [], '6': [], '7': [], '8': [],
};

export const MEMBER_UPCOMING: Record<string, UpcomingClass[]> = {
  '1': [{ title: 'HIIT Burn',    instructor: 'Tania Janek', date: '2026-04-21', time: '10:00', machine: 'M-03' }],
  '2': [{ title: 'Yoga Flow',    instructor: 'Tania Janek', date: '2026-04-22', time: '08:00', machine: 'M-01' }, { title: 'Pilates Core', instructor: 'María López', date: '2026-04-24', time: '17:00', machine: 'M-05' }],
  '3': [{ title: 'Funcional',    instructor: 'Carlos Ruiz', date: '2026-04-22', time: '07:00', machine: 'M-02' }],
  '4': [], '5': [],
  '6': [{ title: 'HIIT Burn',    instructor: 'Tania Janek', date: '2026-04-21', time: '10:00', machine: 'M-07' }],
  '7': [{ title: 'Yoga Flow',    instructor: 'Tania Janek', date: '2026-04-23', time: '08:00', machine: 'M-04' }],
  '8': [],
};
