import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'ghost'
}

export function Button({ className, variant = 'default', ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
        'disabled:pointer-events-none disabled:opacity-40',
        variant === 'default' &&
          'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900',
        variant === 'secondary' &&
          'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100',
        variant === 'ghost' &&
          'bg-transparent text-neutral-800 hover:bg-neutral-200/70 dark:text-neutral-100 dark:hover:bg-neutral-700/70',
        className,
      )}
      {...props}
    />
  )
}
