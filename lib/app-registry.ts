export interface AppDef {
  id: string;
  name: string;
  description: string;
  publicHref: string;
  adminHref: string;
  color: string;
  textColor: string;
  initial: string;
  tags: string[];
  links: { label: string; href: string; external: boolean }[];
}

export const APP_REGISTRY: AppDef[] = [
  {
    id: 'emerald-detailing',
    name: 'Emerald Detailing',
    description: 'Full-stack car detailing platform with booking, CRM, POS, payroll, and affiliate systems.',
    publicHref: 'http://localhost:3001',
    adminHref: 'http://localhost:3001/admin',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    initial: 'E',
    tags: ['Next.js', 'Firebase', 'TypeScript'],
    links: [
      { label: 'Public Site', href: 'http://localhost:3001', external: true },
      { label: 'Admin Console', href: 'http://localhost:3001/admin', external: true },
      { label: 'Bookings', href: 'http://localhost:3001/admin/bookings', external: true },
      { label: 'Clients', href: 'http://localhost:3001/admin/clients', external: true },
      { label: 'Analytics', href: 'http://localhost:3001/admin/analytics', external: true },
      { label: 'POS', href: 'http://localhost:3001/admin/pos', external: true },
    ],
  },
  {
    id: 'parley',
    name: 'Parley',
    description: 'Social debate platform with debates, posts, reactions, and real-time Firestore updates.',
    publicHref: 'http://localhost:3002',
    adminHref: 'http://localhost:3002/admin',
    color: 'bg-violet-500',
    textColor: 'text-violet-400',
    initial: 'P',
    tags: ['React', 'Firebase', 'Zustand'],
    links: [
      { label: 'Public Site', href: 'http://localhost:3002', external: true },
      { label: 'Admin Console', href: 'http://localhost:3002/admin', external: true },
    ],
  },
];

export function getApp(id: string): AppDef | undefined {
  return APP_REGISTRY.find(a => a.id === id);
}
