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
import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { ROLE } from '@/lib/roles'
import { SectionPageLayout } from '@/components/layout'
import { getUsageReport, getUsageReportFilters } from './api'
import { ReportChart } from './components/report-chart'
import { ReportFilters, type ReportFilterState } from './components/report-filters'
import { ReportTable } from './components/report-table'
import { SummaryCards } from './components/summary-cards'

export function UsageReports() {
  const { t } = useTranslation()
  const role = useAuthStore((state) => state.auth.user?.role ?? ROLE.GUEST)
  const isAdmin = role >= ROLE.ADMIN
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<ReportFilterState>(() => ({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    granularity: 'day',
    provider: '',
    model: '',
    billingSource: '',
    userId: '',
  }))

  const params = useMemo(() => ({
    start_time: dayjs(filters.startDate).startOf('day').unix(),
    end_time: dayjs(filters.endDate).endOf('day').unix(),
    granularity: filters.granularity,
    provider: filters.provider || undefined,
    model: filters.model || undefined,
    billing_source: filters.billingSource || undefined,
    user_id: isAdmin && filters.userId ? Number(filters.userId) : undefined,
    p: page,
    page_size: 20,
  }), [filters, isAdmin, page])

  const reportQuery = useQuery({
    queryKey: ['usage-report', params],
    queryFn: async () => {
      const response = await getUsageReport(params)
      if (!response.success || !response.data) throw new Error(response.message || 'Failed to load usage report')
      return response.data
    },
  })
  const filterQuery = useQuery({
    queryKey: ['usage-report-filters'],
    queryFn: async () => {
      const response = await getUsageReportFilters()
      if (!response.success || !response.data) throw new Error(response.message || 'Failed to load report filters')
      return response.data
    },
  })

  const handleFilterChange = (value: ReportFilterState) => {
    setFilters(value)
    setPage(1)
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Usage Reports')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='mx-auto flex w-full max-w-[1680px] flex-col gap-4 pb-6'>
          <div className='flex flex-wrap items-end justify-between gap-3'>
            <div>
              <p className='text-muted-foreground max-w-2xl text-sm'>{t('Confirmed billing ledger statistics by user, provider, and model.')}</p>
            </div>
            <div className='text-muted-foreground text-right text-xs'>
              <div>{t('Last confirmed')}: {reportQuery.data?.last_confirmed_at ? dayjs.unix(reportQuery.data.last_confirmed_at).format('YYYY-MM-DD HH:mm:ss') : '—'}</div>
              {(reportQuery.data?.pending_count ?? 0) > 0 && <div className='text-amber-600'>{t('{{count}} pending records', { count: reportQuery.data?.pending_count })}</div>}
            </div>
          </div>
          <ReportFilters value={filters} options={filterQuery.data} isAdmin={isAdmin} onChange={handleFilterChange} />
          {reportQuery.isError && <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-3 text-sm'>{reportQuery.error.message}</div>}
          <SummaryCards summary={reportQuery.data?.summary} />
          <ReportChart points={reportQuery.data?.trend ?? []} granularity={filters.granularity} />
          <ReportTable
            items={reportQuery.data?.items ?? []}
            total={reportQuery.data?.total ?? 0}
            page={page}
            pageSize={20}
            isAdmin={isAdmin}
            onPageChange={setPage}
          />
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
