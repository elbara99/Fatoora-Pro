import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Row, Col, Statistic, Table, Input, Space, Button, Tag, DatePicker, Descriptions } from 'antd'
import { ArrowLeftOutlined, SearchOutlined, PrinterOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { formatCurrency } from '../utils/format'
import { buildPrintHtml } from '../utils/printTemplate'
import type { SupplierWithBalance, Invoice } from '../types'

export default function SupplierDetails() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState<SupplierWithBalance | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [globalBalanceMap, setGlobalBalanceMap] = useState<Record<number, number>>({})
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      window.api.suppliers.getWithBalance(Number(id)),
      window.api.invoices.getBySupplier(Number(id)),
      window.api.invoices.listAllByDate()
    ]).then(([s, invs, all]) => {
      setSupplier(s ?? null)
      setInvoices(invs)
      let running = 0
      const map: Record<number, number> = {}
      for (const inv of all) {
        running += inv.total
        map[inv.id] = running
      }
      setGlobalBalanceMap(map)
    }).finally(() => setLoading(false))
  }, [id])

  const filtered = useMemo(() => {
    let result = invoices
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(i => i.invoice_number.toLowerCase().includes(q))
    }
    if (dateFilter?.[0] && dateFilter?.[1]) {
      const start = dateFilter[0].format('YYYY-MM-DD')
      const end = dateFilter[1].format('YYYY-MM-DD')
      result = result.filter(i => i.invoice_date >= start && i.invoice_date <= end)
    }
    return result
  }, [invoices, search, dateFilter])

  const handlePrint = async (invoice: Invoice) => {
    const full = await window.api.invoices.get(invoice.id)
    const settings = await window.api.settings.getAll()

    const html = buildPrintHtml({
      invoiceNumber: full.invoice_number,
      invoiceDate: full.invoice_date,
      supplierName: full.supplier_name || '',
      items: (full.items || []).map(i => ({
        name: i.product_name,
        qty: i.quantity,
        price: i.unit_price,
        total: i.total
      })),
      grandTotal: full.total,
      notes: full.notes,
      companyName: settings.company_name || '',
      address: settings.address || '',
      phone: settings.phone || '',
      logo: settings.logo || '',
      language: settings.language || 'ar'
    })
    await window.api.printInvoice(html)
  }

  const runningInvoices = filtered.map(inv => ({
    ...inv,
    _runningBalance: globalBalanceMap[inv.id] ?? 0
  }))

  const columns = [
    { title: t('invoice_number'), dataIndex: 'invoice_number', key: 'num', width: 150 },
    { title: t('invoice_date'), dataIndex: 'invoice_date', key: 'date', width: 110 },
    { title: t('total'), dataIndex: 'total', key: 'total', width: 130, render: (v: number) => formatCurrency(v) },
    { title: t('running_balance'), key: 'running', width: 150,
      render: (_: unknown, r: any) => <Tag color={r._runningBalance > 0 ? 'volcano' : 'green'}>{formatCurrency(r._runningBalance)}</Tag>
    },
    { title: t('actions'), key: 'actions', width: 100,
      render: (_: unknown, r: Invoice) => (
        <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(r)}>{t('print')}</Button>
      )
    }
  ]

  if (!supplier) {
    return <div>{loading ? t('loading') : t('no_results')}</div>
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/suppliers')}>{t('back')}</Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions title={supplier.name} column={3} size="small" bordered>
          <Descriptions.Item label={t('phone')}>{supplier.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('address')}>{supplier.address || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('notes')}>{supplier.notes || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('created_at')}>{supplier.created_at}</Descriptions.Item>
          <Descriptions.Item label={t('last_invoice')}>{supplier.last_invoice_date ?? '-'}</Descriptions.Item>
          <Descriptions.Item label={t('invoices')}>{supplier.invoice_count}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small"><Statistic title={t('total_purchases')} valueFormatter={() => formatCurrency(supplier.total_purchases)} value={supplier.total_purchases} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
        <Col span={8}>
          <Card size="small"><Statistic title={t('outstanding_balance')} valueFormatter={() => formatCurrency(supplier.balance)} value={supplier.balance} valueStyle={{ color: supplier.balance > 0 ? '#cf1322' : '#3f8600' }} /></Card>
        </Col>
        <Col span={8}>
          <Card size="small"><Statistic title={t('total_invoices')} value={supplier.invoice_count} /></Card>
        </Col>
      </Row>

      <Card title={t('invoice_history')} size="small" extra={
        <Space>
          <Input
            placeholder={t('search') + '...'}
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <DatePicker.RangePicker
            onChange={(dates) => setDateFilter(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
            size="small"
          />
        </Space>
      }>
        <Table
          columns={columns}
          dataSource={runningInvoices}
          rowKey="id"
          pagination={{ pageSize: 15 }}
          size="small"
          bordered
          loading={loading}
        />
      </Card>
    </div>
  )
}
