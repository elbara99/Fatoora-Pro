import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table } from 'antd'
import { FileTextOutlined, WalletOutlined, CalendarOutlined, FileAddOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '../utils/format'
import type { DashboardSummary, SupplierDashboard } from '../types'

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [supplierDash, setSupplierDash] = useState<SupplierDashboard | null>(null)

  useEffect(() => {
    window.api.dashboard.summary().then(setData)
    window.api.suppliers.dashboard().then(setSupplierDash)
  }, [])

  const topColumns = [
    { title: t('supplier'), dataIndex: 'name', key: 'name', ellipsis: true },
    { title: t('balance'), dataIndex: 'balance', key: 'balance', width: 140, render: (v: number) => formatCurrency(v) }
  ]

  const latestInvoiceColumns = [
    { title: t('invoice_number'), dataIndex: 'invoice_number', key: 'num', width: 140 },
    { title: t('supplier'), dataIndex: 'supplier_name', key: 'supplier', ellipsis: true },
    { title: t('total'), dataIndex: 'total', key: 'total', width: 120, render: (v: number) => formatCurrency(v) }
  ]

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
            {data?.lastInvoice && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{data.lastInvoice.supplier_name} &mdash; {formatCurrency(data.lastInvoice.total)}</div>}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/suppliers')}>
            <Statistic title={t('total_suppliers')} value={supplierDash?.totalSuppliers ?? 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title={t('total_outstanding')} valueFormatter={(v) => formatCurrency(Number(v))} value={supplierDash?.totalBalance ?? 0} prefix={<WalletOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title={t('highest_balance')} prefix={<UserOutlined />}
              value={supplierDash?.highestBalance?.name ?? '-'}
              valueStyle={supplierDash?.highestBalance && supplierDash.highestBalance.balance > 0 ? { color: '#cf1322' } : undefined}
            />
            {supplierDash?.highestBalance && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{formatCurrency(supplierDash.highestBalance.balance)}</div>}
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/suppliers')}>
            <Statistic title={t('latest_suppliers')} value={supplierDash?.latestSuppliers.length ?? 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title={t('top_suppliers')} size="small">
            <Table
              columns={topColumns}
              dataSource={supplierDash?.top5ByBalance ?? []}
              rowKey="name"
              pagination={false}
              size="small"
              showHeader={false}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('latest_invoices')} size="small">
            <Table
              columns={latestInvoiceColumns}
              dataSource={supplierDash?.latestInvoices ?? []}
              rowKey="id"
              pagination={false}
              size="small"
              showHeader={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
