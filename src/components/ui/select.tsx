import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

type Props = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, children, ...props }: Props) {
  return (
    <select
      className={cn(
        'h-7 rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-900',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
        'dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
