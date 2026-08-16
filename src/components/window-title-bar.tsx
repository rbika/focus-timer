export function WindowTitleBar({ title }: { title: string }) {
  return (
    <div
      data-tauri-drag-region
      className="flex h-8 shrink-0 items-center justify-center"
    >
      <span
        data-tauri-drag-region
        className="text-[13px] font-semibold text-neutral-900 select-none dark:text-neutral-50"
      >
        {title}
      </span>
    </div>
  )
}
