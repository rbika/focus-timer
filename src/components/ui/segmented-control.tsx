import { cn } from '@/utils/cn'

type Option<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  value: T
  options: readonly [Option<T>, Option<T>]
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: Props<T>) {
  const [left] = options
  const isLeft = value === left.value

  return (
    <div className="relative flex h-7 w-full shrink-0 items-center rounded-full bg-neutral-200/80 p-0.5 dark:bg-neutral-700/80">
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0.5 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-[left] duration-200 dark:bg-neutral-100',
          isLeft ? 'left-[2px]' : 'left-[calc(50%+2px)]',
        )}
      />
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              'relative z-10 flex-1 rounded-full py-1 text-xs font-medium transition-colors',
              selected
                ? 'text-neutral-900 dark:text-neutral-800'
                : 'text-neutral-500 dark:text-neutral-400',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
