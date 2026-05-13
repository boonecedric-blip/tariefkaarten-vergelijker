import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maandLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-');
  const maanden = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  const idx = parseInt(m, 10) - 1;
  return `${maanden[idx]} ${y}`;
}
