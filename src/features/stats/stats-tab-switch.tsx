import { SegmentedControl } from '@/components/ui/segmented-control'

export type StatsTab = 'dashboard' | 'entries'

type Props = {
  tab: StatsTab
  onChange: (tab: StatsTab) => void
}

export function StatsTabSwitch({ tab, onChange }: Props) {
  return (
    <SegmentedControl
      value={tab}
      options={[
        { value: 'dashboard', label: 'Dashboard' },
        { value: 'entries', label: 'Entries' },
      ]}
      onChange={onChange}
    />
  )
}
