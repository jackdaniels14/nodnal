// Account state color mapping — used across list views and detail views

export const STATE_OPTIONS = ['Prospect', 'Pricing Presented', 'At Risk', 'Ordering', 'Inactive', 'Lost'] as const;

export function stateColor(state: string): string {
  switch (state) {
    case 'Prospect': return 'bg-sky-500/15 text-sky-400';
    case 'Pricing Presented': return 'bg-amber-500/15 text-amber-400';
    case 'At Risk': return 'bg-red-500/15 text-red-400';
    case 'Ordering': return 'bg-emerald-500/15 text-emerald-400';
    case 'Inactive': return 'bg-gray-500/15 text-gray-400';
    case 'Lost': return 'bg-red-800/20 text-red-500';
    default: return 'bg-gray-500/15 text-gray-400';
  }
}
