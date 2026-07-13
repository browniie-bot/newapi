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
import { api } from '@/lib/api'
import type {
  ApiResponse,
  UsageReportData,
  UsageReportFilters,
  UsageReportParams,
} from './types'

export async function getUsageReport(
  params: UsageReportParams
): Promise<ApiResponse<UsageReportData>> {
  const response = await api.get('/api/usage-report/', { params })
  return response.data
}

export async function getUsageReportFilters(): Promise<
  ApiResponse<UsageReportFilters>
> {
  const response = await api.get('/api/usage-report/filters')
  return response.data
}
