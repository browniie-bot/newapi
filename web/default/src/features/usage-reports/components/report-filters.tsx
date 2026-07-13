/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ReportGranularity, UsageReportFilters } from '../types'

export interface ReportFilterState {
  startDate: string
  endDate: string
  granularity: ReportGranularity
  provider: string
  model: string
  billingSource: string
  userId: string
}

export function ReportFilters(props: {
  value: ReportFilterState
  options?: UsageReportFilters
  isAdmin: boolean
  onChange: (value: ReportFilterState) => void
}) {
  const { t } = useTranslation()
  const update = (patch: Partial<ReportFilterState>) =>
    props.onChange({ ...props.value, ...patch })

  const applyPreset = (preset: 'today' | 'week' | 'month') => {
    const now = dayjs()
    let start = now.startOf('day')
    if (preset === 'week') {
      start = now.subtract((now.day() + 6) % 7, 'day').startOf('day')
    } else if (preset === 'month') {
      start = now.startOf('month')
    }
    update({ startDate: start.format('YYYY-MM-DD'), endDate: now.format('YYYY-MM-DD') })
  }

  const renderSelect = (
    value: string,
    placeholder: string,
    options: Array<{ value: string; label: string }>,
    onChange: (value: string) => void
  ) => (
    <Select value={value || 'all'} onValueChange={(next) => onChange(next === 'all' || next == null ? '' : next)}>
      <SelectTrigger className='min-w-36 bg-background'>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          <SelectItem value='all'>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )

  return (
    <div className='bg-muted/35 ring-foreground/10 flex flex-col gap-3 rounded-xl p-3 ring-1'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='flex rounded-lg bg-background p-0.5 ring-1 ring-foreground/10'>
          <Button size='sm' variant='ghost' onClick={() => applyPreset('today')}>{t('Today')}</Button>
          <Button size='sm' variant='ghost' onClick={() => applyPreset('week')}>{t('This week')}</Button>
          <Button size='sm' variant='ghost' onClick={() => applyPreset('month')}>{t('This month')}</Button>
        </div>
        <Input aria-label={t('Start date')} type='date' value={props.value.startDate} onChange={(event) => update({ startDate: event.target.value })} className='w-auto bg-background' />
        <span className='text-muted-foreground'>—</span>
        <Input aria-label={t('End date')} type='date' value={props.value.endDate} onChange={(event) => update({ endDate: event.target.value })} className='w-auto bg-background' />
        {renderSelect(
          props.value.granularity,
          t('Granularity'),
          [
            { value: 'day', label: t('Daily') },
            { value: 'week', label: t('Weekly') },
            { value: 'month', label: t('Monthly') },
          ],
          (value) => update({ granularity: (value || 'day') as ReportGranularity })
        )}
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        {props.isAdmin && renderSelect(
          props.value.userId,
          t('All users'),
          (props.options?.users ?? []).map((user) => ({ value: String(user.id), label: user.username })),
          (value) => update({ userId: value })
        )}
        {renderSelect(
          props.value.provider,
          t('All providers'),
          (props.options?.providers ?? []).map((provider) => ({ value: provider, label: provider })),
          (value) => update({ provider: value })
        )}
        {renderSelect(
          props.value.model,
          t('All models'),
          (props.options?.models ?? []).map((model) => ({ value: model, label: model })),
          (value) => update({ model: value })
        )}
        {renderSelect(
          props.value.billingSource,
          t('All billing sources'),
          [
            { value: 'wallet', label: t('Wallet') },
            { value: 'subscription', label: t('Subscription') },
          ],
          (value) => update({ billingSource: value })
        )}
      </div>
    </div>
  )
}
