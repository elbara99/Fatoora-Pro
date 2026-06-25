import { useEffect, useState } from 'react'
import { Button, Space, Input, Modal, Table, Popconfirm, message } from 'antd'
import { SearchOutlined, EyeOutlined, PrinterOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '../utils/format'
import { buildPrintHtml } from '../utils/printTemplate'
import type { Invoice } from '../types'

export default function InvoiceHistory() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<Invoice | null>(null)

  const fetch = () => {
    setLoading(true)
    const p = search ? window.api.invoices.search(search) : window.api.invoices.list()
    p.then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  useEffect(() => { if (!search) fetch() }, [search])

  const handleSearch = () => { fetch() }

  const handleEdit = (invoice: Invoice) => {
    navigate('/new-invoice', { state: { editInvoice: invoice } })
  }

  const handleDelete = async (id: number) => {
    await window.api.invoices.delete(id)
    fetch()
  }

  const handlePrint = async (invoice: Invoice) => {
    const full = await window.api.invoices.get(invoice.id)
    const settings = await window.api.settings.getAll()

    const html = buildPrintHtml({
      invoiceNumber: full.invoice_number,
      invoiceDate: full.invoice_date,
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
      language: settings.language || 'en'
    })

    await window.api.printInvoice(html)
  }

  const columns = [
    { title: t('invoice_number'), dataIndex: 'invoice_number', key: 'number', width: 160 },
    { title: t('invoice_date'), dataIndex: 'invoice_date', key: 'date', width: 120 },
    { title: t('total'), dataIndex: 'total', key: 'total', width: 140, render: (v: number) => formatCurrency(v) },
    { title: t('actions'), key: 'actions', width: 240, render: (_: unknown, r: Invoice) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setPreview(r)}>{t('preview')}</Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(r)}>{t('print')}</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>{t('edit')}</Button>
          <Popconfirm title={t('confirm_delete')} onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>{t('delete')}</Button>
          </Popconfirm>
        </Space>
      ) }
  ]

  const previewColumns = [
    { title: '#', dataIndex: 'line_sort', key: '#', width: 40, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: t('product'), dataIndex: 'product_name', key: 'product' },
    { title: t('quantity'), dataIndex: 'quantity', key: 'qty', width: 80, render: (v: number) => v.toFixed(2) },
    { title: t('unit_price'), dataIndex: 'unit_price', key: 'price', width: 120, render: (v: number) => formatCurrency(v) },
    { title: t('line_total'), dataIndex: 'total', key: 'total', width: 120, render: (v: number) => formatCurrency(v) }
  ]

  return (
    <div>
      <div className="page-header">
        <h2>{t('invoice_history')}</h2>
        <Input.Search
          placeholder={t('search') + '...'}
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onSearch={handleSearch}
          style={{ width: 300 }}
          allowClear
        />
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} bordered size="middle" />
      <Modal open={!!preview} title={`${t('invoice_number')}: ${preview?.invoice_number}`}
        onCancel={() => setPreview(null)} width={700}
        footer={
          <Space>
            <Button onClick={() => setPreview(null)}>{t('cancel')}</Button>
            <Button icon={<PrinterOutlined />} type="primary" onClick={() => { preview && handlePrint(preview); setPreview(null) }}>{t('print')}</Button>
          </Space>
        }>
        {preview && (
          <div>
            <div style={{ marginBottom: 16, color: '#666' }}>{t('invoice_date')}: {preview.invoice_date}</div>
            <Table columns={previewColumns} dataSource={(preview as any).items || []} rowKey="id" pagination={false} bordered size="small" />
            <div style={{ textAlign: 'right', marginTop: 16, fontSize: 18, fontWeight: 600 }}>
              {t('total')}: {formatCurrency(preview.total)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
