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
export type ReportGranularity = 'day' | 'week' | 'month'

export interface UsageReportParams {
  start_time: number
  end_time: number
  granularity: ReportGranularity
  provider?: string
  model?: string
  billing_source?: string
  user_id?: number
  p: number
  page_size: number
}

export interface UsageReportSummary {
  prompt_tokens: number
  completion_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  cache_tokens: number
  total_tokens: number
  wallet_quota: number
  subscription_quota: number
  total_quota: number
  wallet_micro_usd: number
  subscription_micro_usd: number
  total_micro_usd: number
}

export interface UsageReportTrendPoint {
  bucket: number
  prompt_tokens: number
  completion_tokens: number
  cache_tokens: number
  total_tokens: number
  quota: number
  user_cost_micro_usd: number
}

export interface UsageReportRow extends UsageReportTrendPoint {
  user_id: number
  username: string
  provider: string
  model_name: string
  billing_source: string
  cache_read_tokens: number
  cache_write_tokens: number
  supplier_cost_micro_usd: number | null
}

export interface UsageReportData {
  summary: UsageReportSummary
  trend: UsageReportTrendPoint[]
  items: UsageReportRow[]
  total: number
  page: number
  page_size: number
  last_confirmed_at: number
  pending_count: number
}

export interface UsageReportFilters {
  providers: string[]
  models: string[]
  users: Array<{ id: number; username: string }>
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}
