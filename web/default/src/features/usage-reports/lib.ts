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
import type { ReportGranularity } from './types'

export function formatTokenCount(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(value)
}

export function formatUSD(microUSD: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(microUSD / 1_000_000)
}

export function formatBucket(
  timestamp: number,
  granularity: ReportGranularity
): string {
  const date = dayjs.unix(timestamp)
  if (granularity === 'month') return date.format('YYYY-MM')
  if (granularity === 'week') return date.format('MM-DD')
  return date.format('MM-DD')
}
