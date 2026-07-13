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
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBucket, formatTokenCount, formatUSD } from '../lib'
import type { ReportGranularity, UsageReportTrendPoint } from '../types'

export function ReportChart(props: {
  points: UsageReportTrendPoint[]
  granularity: ReportGranularity
}) {
  const { t } = useTranslation()
  const data = props.points.map((point) => ({
    ...point,
    label: formatBucket(point.bucket, props.granularity),
    cost: point.user_cost_micro_usd / 1_000_000,
  }))

  return (
    <Card>
      <CardHeader className='border-b'>
        <CardTitle>{t('Usage and cost trend')}</CardTitle>
      </CardHeader>
      <CardContent className='h-72 pt-2'>
        {data.length === 0 ? (
          <div className='text-muted-foreground flex h-full items-center justify-center'>{t('No report data')}</div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart data={data} margin={{ top: 16, right: 8, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id='usageReportTokens' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='var(--primary)' stopOpacity={0.32} />
                  <stop offset='95%' stopColor='var(--primary)' stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='var(--border)' />
              <XAxis dataKey='label' tickLine={false} axisLine={false} fontSize={12} />
              <YAxis yAxisId='tokens' tickFormatter={formatTokenCount} tickLine={false} axisLine={false} width={54} fontSize={12} />
              <YAxis yAxisId='cost' orientation='right' tickFormatter={(value) => `$${value}`} tickLine={false} axisLine={false} width={54} fontSize={12} />
              <Tooltip
                formatter={(value, name) =>
                  name === 'cost'
                    ? [formatUSD(Number(value) * 1_000_000), t('User cost')]
                    : [Number(value).toLocaleString(), t('Tokens')]
                }
                contentStyle={{ borderRadius: 10, borderColor: 'var(--border)', background: 'var(--popover)' }}
              />
              <Area yAxisId='tokens' type='monotone' dataKey='total_tokens' stroke='var(--primary)' fill='url(#usageReportTokens)' strokeWidth={2} />
              <Bar yAxisId='cost' dataKey='cost' fill='var(--chart-2)' radius={[4, 4, 0, 0]} maxBarSize={26} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
