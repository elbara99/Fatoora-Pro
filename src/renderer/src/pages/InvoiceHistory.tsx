import { useEffect, useState } from 'react'
import { Button, Space, Input, Modal, Table, Popconfirm, message, Select, DatePicker, InputNumber, Row, Col } from 'antd'
import { SearchOutlined, EyeOutlined, PrinterOutlined, EditOutlined, DeleteOutlined, CopyOutlined, FilterOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '../utils/format'
import { buildPrintHtml } from '../utils/printTemplate'
import type { Invoice, Supplier } from '../types'

export default function InvoiceHistory() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<Invoice | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filterSupplier, setFilterSupplier] = useState<number | null>(null)
  const [filterDateFrom, setFilterDateFrom] = useState<dayjs.Dayjs | null>(null)
  const [filterDateTo, setFilterDateTo] = useState<dayjs.Dayjs | null>(null)
  const [filterAmountMin, setFilterAmountMin] = useState<number | null>(null)
  const [filterAmountMax, setFilterAmountMax] = useState<number | null>(null)

  useEffect(() => {
    window.api.suppliers.list().then(setSuppliers)
  }, [])

  const hasFilters = filterSupplier || filterDateFrom || filterDateTo || filterAmountMin !== null || filterAmountMax !== null

  const fetch = () => {
    setLoading(true)
    const hasAdvanced = hasFilters || search
    if (hasAdvanced) {
      window.api.invoices.searchAdvanced({
        q: search || undefined,
        supplierId: filterSupplier || undefined,
        dateFrom: filterDateFrom?.format('YYYY-MM-DD'),
        dateTo: filterDateTo?.format('YYYY-MM-DD'),
        amountMin: filterAmountMin ?? undefined,
        amountMax: filterAmountMax ?? undefined
      }).then(setData).finally(() => setLoading(false))
    } else {
      window.api.invoices.list().then(setData).finally(() => setLoading(false))
    }
  }

  useEffect(() => { fetch() }, [])

  const handleSearch = () => { fetch() }

  const handleEdit = (invoice: Invoice) => {
    navigate('/new-invoice', { state: { editInvoice: invoice } })
  }

  const handleDuplicate = async (invoice: Invoice) => {
    const full = await window.api.invoices.get(invoice.id)
    navigate('/new-invoice', { state: { duplicateInvoice: full } })
  }

  const handleDelete = async (id: number) => {
    try {
      await window.api.invoices.delete(id)
      fetch()
    } catch (err) {
      message.error(String(err))
    }
  }

  const handlePrint = async (invoice: Invoice) => {
    const full = await window.api.invoices.get(invoice.id)
    const settings = await window.api.settings.getAll()

    let supplierPhone = ''
    let supplierAddress = ''
    let supplierNotes = ''
    let previousBalance = 0
    if (full.supplier_id) {
      const sup = await window.api.suppliers.get(full.supplier_id)
      if (sup) {
        supplierPhone = sup.phone || ''
        supplierAddress = sup.address || ''
        supplierNotes = sup.notes || ''
      }
      const bal = await window.api.invoices.globalBalance(full.id)
      previousBalance = bal.previousBalance
    }

    const lang = settings.language || 'ar'
    const newBalance = previousBalance + full.total
    const html = buildPrintHtml({
      invoiceNumber: full.invoice_number,
      invoiceDate: full.invoice_date,
      supplierName: full.supplier_name || '',
      supplierPhone,
      supplierAddress,
      supplierNotes,
      items: (full.items || []).map(i => ({
        name: i.product_name,
        qty: i.quantity,
        price: i.unit_price,
        total: i.total
      })),
      subtotal: full.total,
      grandTotal: full.total,
      previousBalance,
      newBalance,
      notes: full.notes,
      companyName: settings.company_name || '',
      address: settings.address || '',
      phone: settings.phone || '',
      logo: settings.logo || '',
      language: lang,
      version: '1.0.0',
      labels: {
        invoiceTitle: t('print_invoice_title'),
        invoiceNo: t('print_invoice_no'),
        invoiceDate: t('print_invoice_date'),
        printDate: t('print_print_date'),
        supplierBoxTitle: t('print_supplier_box'),
        supplierName: t('print_supplier_name'),
        phone: t('print_phone'),
        address: t('print_address'),
        notes: t('print_notes'),
        colNo: t('print_col_no'),
        colProduct: t('print_col_product'),
        colQty: t('print_col_qty'),
        colPrice: t('print_col_price'),
        colTotal: t('print_col_total'),
        subtotal: t('print_subtotal'),
        previousBalance: t('print_previous_balance'),
        grandTotal: t('print_grand_total'),
        newBalance: t('print_new_balance'),
        thankYou: t('print_thank_you'),
        programName: t('print_program_name'),
        versionLabel: t('print_version'),
        autoPrint: t('print_auto_print')
      }
    })

    await window.api.printInvoice(html)
  }

  const columns = [
    { title: t('invoice_number'), dataIndex: 'invoice_number', key: 'number', width: 160 },
    { title: t('invoice_date'), dataIndex: 'invoice_date', key: 'date', width: 120 },
    { title: t('supplier'), dataIndex: 'supplier_name', key: 'supplier', width: 200, ellipsis: true },
    { title: t('total'), dataIndex: 'total', key: 'total', width: 140, render: (v: number) => formatCurrency(v) },
    { title: t('actions'), key: 'actions', width: 280, render: (_: unknown, r: Invoice) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setPreview(r)}>{t('preview')}</Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(r)}>{t('print')}</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>{t('edit')}</Button>
          <Button size="small" icon={<CopyOutlined />} onClick={() => handleDuplicate(r)}>{t('duplicate')}</Button>
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
        <Space>
          <Input.Search
            placeholder={t('search') + '...'}
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300 }}
            allowClear
          />
          <Button icon={<FilterOutlined />} type={showFilters ? 'primary' : 'default'} onClick={() => setShowFilters(!showFilters)} />
        </Space>
      </div>
      {showFilters && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 6 }}>
          <Col>
            <Select
              placeholder={t('supplier')}
              value={filterSupplier}
              onChange={setFilterSupplier}
              allowClear
              style={{ width: 200 }}
              options={suppliers.map(s => ({ value: s.id, label: s.name }))}
            />
          </Col>
          <Col>
            <DatePicker value={filterDateFrom} onChange={setFilterDateFrom} placeholder={t('invoice_date') + ' ' + t('from')} />
          </Col>
          <Col>
            <DatePicker value={filterDateTo} onChange={setFilterDateTo} placeholder={t('invoice_date') + ' ' + t('to')} />
          </Col>
          <Col>
            <InputNumber value={filterAmountMin} onChange={setFilterAmountMin} placeholder={t('min')} style={{ width: 120 }} min={0} />
          </Col>
          <Col>
            <InputNumber value={filterAmountMax} onChange={setFilterAmountMax} placeholder={t('max')} style={{ width: 120 }} min={0} />
          </Col>
          <Col>
            <Button type="primary" onClick={handleSearch}>{t('search')}</Button>
          </Col>
        </Row>
      )}
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
            <div style={{ marginBottom: 8, color: '#666' }}>{t('invoice_date')}: {preview.invoice_date}</div>
            <div style={{ marginBottom: 16, color: '#333', fontWeight: 600 }}>{t('supplier')}: {preview.supplier_name}</div>
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
