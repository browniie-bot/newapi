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
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTokenCount, formatUSD } from '../lib'
import type { UsageReportSummary } from '../types'

export function SummaryCards(props: { summary?: UsageReportSummary }) {
  const { t } = useTranslation()
  const summary = props.summary
  const items = [
    { label: t('Input tokens'), value: formatTokenCount(summary?.prompt_tokens ?? 0), tone: 'text-sky-600 dark:text-sky-400' },
    { label: t('Output tokens'), value: formatTokenCount(summary?.completion_tokens ?? 0), tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('Cache tokens'), value: formatTokenCount(summary?.cache_tokens ?? 0), tone: 'text-amber-600 dark:text-amber-400' },
    { label: t('Wallet cost'), value: formatUSD(summary?.wallet_micro_usd ?? 0), tone: 'text-foreground' },
    { label: t('Subscription usage'), value: formatUSD(summary?.subscription_micro_usd ?? 0), tone: 'text-foreground' },
    { label: t('Total user cost'), value: formatUSD(summary?.total_micro_usd ?? 0), tone: 'text-foreground' },
  ]

  return (
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-6'>
      {items.map((item) => (
        <Card key={item.label} size='sm' className='relative overflow-hidden'>
          <div className='from-primary/10 absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent' />
          <CardHeader>
            <CardTitle className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`font-mono text-xl font-semibold tabular-nums ${item.tone}`}>{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
