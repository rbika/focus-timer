import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges class names and resolves Tailwind conflicts. */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { cn }
