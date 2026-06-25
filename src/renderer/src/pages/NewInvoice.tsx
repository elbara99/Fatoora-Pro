import { useEffect, useRef, useState, useCallback } from 'react'
import { Input, InputNumber, Button, Table, Space, DatePicker, message, Card, Statistic } from 'antd'
import { PlusOutlined, SendOutlined, PrinterOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatCurrency } from '../utils/format'
import { buildPrintHtml } from '../utils/printTemplate'
import type { Product, Invoice } from '../types'

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
  const isEditing = !!editInvoice

  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<LineItem[]>(() =>
    editInvoice
      ? (editInvoice.items || []).map(item => ({
          key: nextKey(),
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      : [{ key: nextKey(), product_id: null, product_name: '', quantity: 1, unit_price: 0 }]
  )
  const [invoiceDate, setInvoiceDate] = useState(editInvoice ? dayjs(editInvoice.invoice_date) : dayjs())
  const [saving, setSaving] = useState(false)
  const [searchTexts, setSearchTexts] = useState<Record<number, string>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    window.api.products.list().then(setProducts)
  }, [])

  useEffect(() => {
    if (editInvoice && editInvoice.items) {
      const texts: Record<number, string> = {}
      editInvoice.items.forEach((item, idx) => {
        const line = items[idx]
        if (line) texts[line.key] = item.product_name
      })
      setSearchTexts(texts)
    }
  }, [])

  const grandTotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)

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

  const handleSave = async () => {
    const validItems = items.filter(i => i.product_id && i.quantity > 0)
    if (validItems.length === 0) { message.error('Add at least one item'); return }
    setSaving(true)
    try {
      const payload = {
        invoice_date: invoiceDate.format('YYYY-MM-DD'),
        items: validItems.map(i => ({
          product_id: i.product_id!,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price
        }))
      }
      if (isEditing) {
        console.log('[NewInvoice] Updating invoice', editInvoice!.id, payload)
        await window.api.invoices.update(editInvoice!.id, payload)
        message.success('Invoice updated')
        navigate('/invoices')
      } else {
        console.log('[NewInvoice] Creating invoice', payload)
        await window.api.invoices.create(payload)
        message.success('Invoice saved')
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

    const html = buildPrintHtml({
      invoiceNumber: invNumber,
      invoiceDate: invoiceDate.format('YYYY-MM-DD'),
      items: validItems.map(i => ({
        name: i.product_name,
        qty: i.quantity,
        price: i.unit_price,
        total: i.quantity * i.unit_price
      })),
      grandTotal,
      companyName: settings.company_name || '',
      address: settings.address || '',
      phone: settings.phone || '',
      logo: settings.logo || '',
      language: settings.language || 'en'
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
        return (
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
                if (!match && filteredProducts(r.key).length === 1) {
                  const first = filteredProducts(r.key)[0]
                  handleProductSelect(r.key, first.id)
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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

      <Card style={{ width: 300, marginLeft: 'auto' }}>
        <Statistic title={t('total')} valueFormatter={() => formatCurrency(grandTotal)} value={grandTotal} />
      </Card>
    </div>
  )
}
