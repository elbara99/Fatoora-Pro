import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic } from 'antd'
import { FileTextOutlined, WalletOutlined, CalendarOutlined, FileAddOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../utils/format'
import type { DashboardSummary } from '../types'

export default function Dashboard() {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardSummary | null>(null)

  useEffect(() => {
    window.api.dashboard.summary().then(setData)
  }, [])

  return (
    <div>
      <h2>{t('dashboard')}</h2>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card><Statistic title={t('today_invoices')} value={data?.todayCount ?? 0} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={t('today_sales')} valueFormatter={(v) => formatCurrency(Number(v))} value={data?.todayTotal ?? 0} prefix={<WalletOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title={t('month_sales')} valueFormatter={(v) => formatCurrency(Number(v))} value={data?.monthTotal ?? 0} prefix={<CalendarOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title={t('last_invoice')} value={data?.lastInvoice?.invoice_number ?? '-'} prefix={<FileAddOutlined />} />
            {data?.lastInvoice && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{formatCurrency(data.lastInvoice.total)}</div>}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
