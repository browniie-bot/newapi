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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTokenCount, formatUSD } from '../lib'
import type { UsageReportRow } from '../types'

export function ReportTable(props: {
  items: UsageReportRow[]
  total: number
  page: number
  pageSize: number
  isAdmin: boolean
  onPageChange: (page: number) => void
}) {
  const { t } = useTranslation()
  const pageCount = Math.max(1, Math.ceil(props.total / props.pageSize))

  return (
    <Card>
      <CardHeader className='border-b'>
        <CardTitle>{t('Usage details')}</CardTitle>
      </CardHeader>
      <CardContent className='px-0'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='pl-4'>{t('Period')}</TableHead>
              {props.isAdmin && <TableHead>{t('User')}</TableHead>}
              <TableHead>{t('Provider')}</TableHead>
              <TableHead>{t('Model')}</TableHead>
              <TableHead>{t('Billing source')}</TableHead>
              <TableHead className='text-right'>{t('Input')}</TableHead>
              <TableHead className='text-right'>{t('Output')}</TableHead>
              <TableHead className='text-right'>{t('Cache')}</TableHead>
              <TableHead className='text-right'>{t('User cost')}</TableHead>
              <TableHead className='pr-4 text-right'>{t('Supplier cost')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.items.length === 0 ? (
              <TableRow><TableCell colSpan={props.isAdmin ? 10 : 9} className='text-muted-foreground h-28 text-center'>{t('No report data')}</TableCell></TableRow>
            ) : props.items.map((item) => (
              <TableRow key={`${item.bucket}-${item.user_id}-${item.provider}-${item.model_name}-${item.billing_source}`}>
                <TableCell className='pl-4 font-mono'>{dayjs.unix(item.bucket).format('YYYY-MM-DD')}</TableCell>
                {props.isAdmin && <TableCell className='font-medium'>{item.username}</TableCell>}
                <TableCell>{item.provider}</TableCell>
                <TableCell className='max-w-52 truncate font-mono text-xs'>{item.model_name}</TableCell>
                <TableCell>{item.billing_source === 'subscription' ? t('Subscription') : t('Wallet')}</TableCell>
                <TableCell className='text-right font-mono'>{formatTokenCount(item.prompt_tokens)}</TableCell>
                <TableCell className='text-right font-mono'>{formatTokenCount(item.completion_tokens)}</TableCell>
                <TableCell className='text-right font-mono'>{formatTokenCount(item.cache_tokens)}</TableCell>
                <TableCell className='text-right font-mono font-medium'>{formatUSD(item.user_cost_micro_usd)}</TableCell>
                <TableCell className='text-muted-foreground pr-4 text-right'>{item.supplier_cost_micro_usd == null ? t('Not configured') : formatUSD(item.supplier_cost_micro_usd)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className='flex items-center justify-between border-t px-4 pt-3'>
          <span className='text-muted-foreground text-xs'>{t('{{count}} records', { count: props.total })}</span>
          <div className='flex items-center gap-2'>
            <Button size='sm' variant='outline' disabled={props.page <= 1} onClick={() => props.onPageChange(props.page - 1)}>{t('Previous')}</Button>
            <span className='text-muted-foreground text-xs'>{props.page} / {pageCount}</span>
            <Button size='sm' variant='outline' disabled={props.page >= pageCount} onClick={() => props.onPageChange(props.page + 1)}>{t('Next')}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
