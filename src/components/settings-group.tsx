import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/utils/cn'

export function SettingsGroup({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />
}

export function SettingsGroupTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'px-1 text-[13px] font-semibold text-neutral-900 dark:text-neutral-50',
        className,
      )}
      {...props}
    />
  )
}

export function SettingsGroupDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('px-1 text-xs text-neutral-500', className)} {...props} />
  )
}

export function SettingsGroupContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[10px] bg-neutral-100/60 dark:bg-neutral-800/60',
        className,
      )}
      {...props}
    />
  )
}

export function SettingsGroupItem({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative flex min-h-11 items-center justify-between gap-3 px-3.5 py-2',
        // Hairline divider between items, inset to align with the label.
        'not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-3.5',
        'not-first:before:border-t not-first:before:border-neutral-200 not-first:before:content-[""]',
        'dark:not-first:before:border-white/10',
        className,
      )}
      {...props}
    />
  )
}

export function SettingsGroupItemText({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex min-w-0 flex-col gap-0.5', className)}
      {...props}
    />
  )
}

export function SettingsGroupItemLabel({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { children?: ReactNode }) {
  return (
    <label
      className={cn(
        'text-[13px] text-neutral-800 dark:text-neutral-100',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  )
}

export function SettingsGroupItemDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-neutral-500', className)} {...props} />
}

export function SettingsGroupItemControl({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex shrink-0 items-center', className)} {...props} />
  )
}
