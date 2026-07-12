import { useEffect, useRef, useState, useCallback } from 'react'
import { Input, InputNumber, Button, Table, Space, DatePicker, message, Card, Statistic, Select, Modal, Form, Row, Col } from 'antd'
import { PlusOutlined, SendOutlined, PrinterOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatCurrency } from '../utils/format'
import { buildPrintHtml } from '../utils/printTemplate'
import type { Product, Invoice, Supplier } from '../types'

interface LineItem {
  key: number
  product_id: number | null
  product_name: string
  quantity: number
  unit_price: number
}

let keyCounter = 0
const nextKey = () => ++keyCounter

export default function NewInvoice() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const editInvoice = (location.state as any)?.editInvoice as Invoice | undefined
  const duplicateInvoice = (location.state as any)?.duplicateInvoice as Invoice | undefined
  const isEditing = !!editInvoice
  const sourceInvoice = editInvoice || duplicateInvoice

  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [items, setItems] = useState<LineItem[]>(() =>
    sourceInvoice
      ? (sourceInvoice.items || []).map(item => ({
          key: nextKey(),
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      : [{ key: nextKey(), product_id: null, product_name: '', quantity: 1, unit_price: 0 }]
  )
  const [invoiceDate, setInvoiceDate] = useState(sourceInvoice ? dayjs(sourceInvoice.invoice_date) : dayjs())
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(sourceInvoice?.supplier_id ?? null)
  const [supplierName, setSupplierName] = useState(sourceInvoice?.supplier_name || '')
  const [saving, setSaving] = useState(false)
  const [searchTexts, setSearchTexts] = useState<Record<number, string>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [prevBalance, setPrevBalance] = useState(0)
  const [newSupplierModal, setNewSupplierModal] = useState(false)
  const [newSupplierForm] = Form.useForm()
  const [newProductModal, setNewProductModal] = useState(false)
  const [newProductForm] = Form.useForm()
  const newProductTargetKeyRef = useRef<number | null>(null)

  useEffect(() => {
    window.api.products.list().then(setProducts)
    window.api.suppliers.list().then(setSuppliers)
  }, [])

  useEffect(() => {
    if (sourceInvoice && sourceInvoice.items) {
      const texts: Record<number, string> = {}
      sourceInvoice.items.forEach((item, idx) => {
        const line = items[idx]
        if (line) texts[line.key] = item.product_name
      })
      setSearchTexts(texts)
    }
  }, [])

  useEffect(() => {
    const excludeId = isEditing ? editInvoice!.id : undefined
    window.api.invoices.globalBalance(excludeId).then(b => setPrevBalance(b.previousBalance))
  }, [])

  const grandTotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const newBalance = prevBalance + grandTotal

  const setItem = useCallback((key: number, field: string, value: any) => {
    setItems(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i))
  }, [])

  const addRow = useCallback(() => {
    const newKey = nextKey()
    setItems(prev => [...prev, { key: newKey, product_id: null, product_name: '', quantity: 1, unit_price: 0 }])
    setSearchTexts(prev => ({ ...prev, [newKey]: '' }))
    setTimeout(() => {
      const el = inputRefs.current[`product-${newKey}`]
      if (el) el.focus()
    }, 50)
  }, [])

  const removeRow = useCallback((key: number) => {
    if (items.length <= 1) {
      setItems([{ key: nextKey(), product_id: null, product_name: '', quantity: 1, unit_price: 0 }])
      return
    }
    setItems(prev => prev.filter(i => i.key !== key))
  }, [items.length])

  const handleProductSelect = useCallback((key: number, productId: number) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setItem(key, 'product_id', product.id)
      setItem(key, 'product_name', product.name)
      setItem(key, 'unit_price', product.selling_price)
      setSearchTexts(prev => ({ ...prev, [key]: product.name }))
    }
  }, [products, setItem])

  const handleSupplierChange = (value: number | null) => {
    if (value === -1) {
      setNewSupplierModal(true)
      return
    }
    setSelectedSupplier(value)
    if (value) {
      const s = suppliers.find(sup => sup.id === value)
      setSupplierName(s?.name || '')
    } else {
      setSupplierName('')
    }
  }

  const handleNewSupplier = async () => {
    const values = await newSupplierForm.validateFields()
    const result = await window.api.suppliers.create(values)
    if (result.success) {
      const created = result.data
      setSuppliers(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedSupplier(created.id)
      setSupplierName(created.name)
      setNewSupplierModal(false)
      newSupplierForm.resetFields()
      message.success(t('supplier_created'))
    } else {
      setSelectedSupplier(result.existingId)
      setSupplierName(result.existingName)
      setNewSupplierModal(false)
      newSupplierForm.resetFields()
      message.info(t('supplier_duplicate', { name: result.existingName }))
    }
  }

  const handleNewProduct = async () => {
    const values = await newProductForm.validateFields()
    const created = await window.api.products.create(values)
    const updated = await window.api.products.list()
    setProducts(updated)
    if (newProductTargetKeyRef.current) {
      handleProductSelect(newProductTargetKeyRef.current, created.id)
    }
    setNewProductModal(false)
    newProductForm.resetFields()
    message.success(t('product_created'))
  }

  const handleSave = async () => {
    if (!selectedSupplier) { message.error(t('select_supplier')); return }
    const validItems = items.filter(i => i.product_id && i.quantity > 0)
    if (validItems.length === 0) { message.error(t('add_item_required')); return }
    setSaving(true)
    try {
      const payload = {
        invoice_date: invoiceDate.format('YYYY-MM-DD'),
        supplier_id: selectedSupplier,
        supplier_name: supplierName,
        items: validItems.map(i => ({
          product_id: i.product_id!,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price
        }))
      }
      if (isEditing) {
        await window.api.invoices.update(editInvoice!.id, payload)
        message.success(t('invoice_updated'))
        navigate('/invoices')
      } else {
        await window.api.invoices.create(payload)
        message.success(t('invoice_saved'))
        setSelectedSupplier(null)
        setSupplierName('')
        setPrevBalance(0)
        setItems([{ key: nextKey(), product_id: null, product_name: '', quantity: 1, unit_price: 0 }])
        setSearchTexts({})
      }
    } catch (err) {
      console.error('[NewInvoice] Save error:', err)
      message.error(String(err))
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = async () => {
    const validItems = items.filter(i => i.product_id && i.quantity > 0)
    if (validItems.length === 0) { message.error('Save the invoice first'); return }

    const settings = await window.api.settings.getAll()
    const invNumber = isEditing ? editInvoice!.invoice_number : ''

    const supplier = selectedSupplier ? suppliers.find(s => s.id === selectedSupplier) : null
    const lang = settings.language || 'ar'
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)

    const html = buildPrintHtml({
      invoiceNumber: invNumber,
      invoiceDate: invoiceDate.format('YYYY-MM-DD'),
      supplierName: supplier?.name || supplierName.trim(),
      supplierPhone: supplier?.phone || '',
      supplierAddress: supplier?.address || '',
      supplierNotes: supplier?.notes || '',
      items: validItems.map(i => ({
        name: i.product_name,
        qty: i.quantity,
        price: i.unit_price,
        total: i.quantity * i.unit_price
      })),
      subtotal,
      grandTotal,
      previousBalance: prevBalance,
      newBalance,
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

  const filteredProducts = useCallback((key: number) => {
    const text = searchTexts[key] || ''
    if (!text) return products
    const lower = text.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(lower) || p.code.toLowerCase().includes(lower)
    )
  }, [products, searchTexts])

  const columns = [
    {
      title: t('product'), dataIndex: 'product_name', key: 'product', width: '45%',
      render: (_: string, _r: LineItem) => {
        const r = _r
        const searchText = searchTexts[r.key] ?? ''
        const filtered = filteredProducts(r.key)
        const showAddHint = searchText.trim() !== '' && filtered.length === 0 && !r.product_id
        return (
          <div>
            <input
              ref={el => inputRefs.current[`product-${r.key}`] = el}
              list={`products-${r.key}`}
              value={searchTexts[r.key] ?? r.product_name}
              onChange={e => {
                setSearchTexts(prev => ({ ...prev, [r.key]: e.target.value }))
                const match = products.find(p => p.name === e.target.value)
                if (match) handleProductSelect(r.key, match.id)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const match = products.find(p => p.name === (searchTexts[r.key] ?? ''))
                  if (!match && filtered.length === 1) {
                    handleProductSelect(r.key, filtered[0].id)
                  } else if (!match && showAddHint) {
                    newProductTargetKeyRef.current = r.key
                    newProductForm.setFieldsValue({ name: searchText, selling_price: 0 })
                    setNewProductModal(true)
                  }
                  if (r.product_id) {
                    const ref = inputRefs.current[`qty-${r.key}`]
                    if (ref) ref.focus()
                  }
                }
              }}
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14 }}
              placeholder={t('search') + '...'}
            />
            {showAddHint && (
              <div style={{ marginTop: 2 }}>
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    newProductTargetKeyRef.current = r.key
                    newProductForm.setFieldsValue({ name: searchText, selling_price: 0 })
                    setNewProductModal(true)
                  }}
                  style={{ padding: 0, fontSize: 12, height: 'auto' }}
                >
                  {t('add_product')}
                </Button>
              </div>
            )}
          </div>
        )
      }
    },
    {
      title: t('quantity'), dataIndex: 'quantity', key: 'quantity', width: '15%',
      render: (v: number, r: LineItem) => (
        <InputNumber
          ref={el => inputRefs.current[`qty-${r.key}`] = el}
          min={0.01}
          value={v}
          onChange={val => setItem(r.key, 'quantity', val ?? 0)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const ref = inputRefs.current[`price-${r.key}`]
              if (ref) ref.focus()
            }
          }}
          style={{ width: '100%' }}
          bordered={false}
        />
      )
    },
    {
      title: t('unit_price'), dataIndex: 'unit_price', key: 'price', width: '15%',
      render: (v: number, r: LineItem) => (
        <InputNumber
          ref={el => inputRefs.current[`price-${r.key}`] = el}
          min={0}
          value={v}
          onChange={val => setItem(r.key, 'unit_price', val ?? 0)}
          onKeyDown={e => {
            if (e.key === 'Enter') { addRow() }
          }}
          style={{ width: '100%' }}
          bordered={false}
        />
      )
    },
    {
      title: t('line_total'), key: 'line_total', width: '15%',
      render: (_: unknown, r: LineItem) => (
        <span style={{ fontWeight: 600 }}>{formatCurrency(r.quantity * r.unit_price)}</span>
      )
    },
    {
      title: '', key: 'action', width: '10%',
      render: (_: unknown, r: LineItem) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeRow(r.key)} />
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ margin: 0 }}>{isEditing ? t('edit_invoice') : t('new_invoice')}</h2>
          {isEditing && <span style={{ color: '#666', fontSize: 14 }}>{editInvoice!.invoice_number}</span>}
        </div>
        <Space>
          <DatePicker value={invoiceDate} onChange={v => v && setInvoiceDate(v)} />
          <Button icon={<SendOutlined />} type="primary" onClick={handleSave} loading={saving}>{isEditing ? t('update_invoice') : t('save_invoice')}</Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>{t('print')}</Button>
        </Space>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#555' }}>{t('supplier')} <span style={{ color: '#ff4d4f' }}>*</span></label>
        <Select
          value={selectedSupplier}
          onChange={handleSupplierChange}
          style={{ width: 360 }}
          placeholder={t('select_supplier')}
          showSearch
          filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())}
          options={[
            ...suppliers.map(s => ({ value: s.id, label: s.name })),
            { value: -1, label: `+ ${t('add_new_supplier')}`, disabled: false }
          ]}
        />
      </div>

      {items.map(r => (
        <datalist key={`dl-${r.key}`} id={`products-${r.key}`}>
          {filteredProducts(r.key).map(p => (
            <option key={p.id} value={p.name} data-id={p.id} />
          ))}
        </datalist>
      ))}

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {items.filter(i => i.product_id).map(i => (
          <input key={`hidden-${i.key}`} type="hidden" />
        ))}
      </div>

      <Table
        columns={columns}
        dataSource={items}
        rowKey="key"
        pagination={false}
        bordered
        size="small"
        footer={() => (
          <Button type="dashed" block icon={<PlusOutlined />} onClick={addRow}>
            {t('add_item')}
          </Button>
        )}
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16} style={{ justifyContent: 'flex-end' }}>
        <Col>
          <Card size="small" style={{ width: 240 }}>
            <Statistic title={t('total')} valueFormatter={() => formatCurrency(grandTotal)} value={grandTotal} />
          </Card>
        </Col>
        {selectedSupplier && (
          <>
            <Col>
              <Card size="small" style={{ width: 240 }}>
                <Statistic title={t('previous_balance')} valueFormatter={() => formatCurrency(prevBalance)} value={prevBalance} />
              </Card>
            </Col>
            <Col>
              <Card size="small" style={{ width: 240, borderLeft: '3px solid #1677ff' }}>
                <Statistic title={t('new_balance')} valueFormatter={() => formatCurrency(newBalance)} value={newBalance} valueStyle={{ color: '#1677ff', fontWeight: 700 }} />
              </Card>
            </Col>
          </>
        )}
      </Row>

      <Modal
        title={t('add_new_supplier')}
        open={newSupplierModal}
        onCancel={() => setNewSupplierModal(false)}
        onOk={handleNewSupplier}
        okText={t('save')}
      >
        <Form form={newSupplierForm} layout="vertical">
          <Form.Item name="name" label={t('name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label={t('phone')}><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('add_product')}
        open={newProductModal}
        onCancel={() => setNewProductModal(false)}
        onOk={handleNewProduct}
        okText={t('save')}
      >
        <Form form={newProductForm} layout="vertical">
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{t('code_auto')}</div>
          <Form.Item name="name" label={t('name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="selling_price" label={t('selling_price')} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
