import { useEffect, useState } from 'react'
import { Button, Form, Input, Space, Popconfirm, Tag, message } from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '../utils/format'
import DataTable from '../components/ui/DataTable'
import FormModal from '../components/ui/FormModal'
import type { SupplierWithBalance } from '../types'

export default function Suppliers() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState<SupplierWithBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierWithBalance | null>(null)
  const [form] = Form.useForm()

  const fetch = () => {
    setLoading(true)
    window.api.suppliers.listWithBalances().then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (r: SupplierWithBalance) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true) }

  const handleSave = async () => {
    const values = await form.validateFields()
    if (editing) {
      await window.api.suppliers.update(editing.id, values)
    } else {
      const result = await window.api.suppliers.create(values)
      if (!result.success) {
        message.error(t('supplier_duplicate', { name: result.existingName }))
        return
      }
    }
    setModalOpen(false)
    fetch()
  }

  const handleDelete = async (id: number) => {
    try {
      const deleted = await window.api.suppliers.delete(id)
      if (!deleted) { message.error(t('supplier_has_invoices')); return }
      fetch()
    } catch (err) {
      message.error(String(err))
    }
  }

  const columns = [
    { title: t('name'), dataIndex: 'name', key: 'name', ellipsis: true },
    { title: t('phone'), dataIndex: 'phone', key: 'phone', width: 130 },
    { title: t('invoices'), dataIndex: 'invoice_count', key: 'inv_count', width: 80, align: 'center' as const },
    { title: t('total_purchases'), dataIndex: 'total_purchases', key: 'purchases', width: 140, render: (v: number) => formatCurrency(v) },
    { title: t('balance'), dataIndex: 'balance', key: 'balance', width: 140,
      render: (v: number) => {
        const color = v > 0 ? 'volcano' : 'green'
        return <Tag color={color}>{formatCurrency(v)}</Tag>
      }
    },
    { title: t('last_invoice'), dataIndex: 'last_invoice_date', key: 'last_inv', width: 120, render: (v: string | null) => v ?? '-' },
    { title: t('actions'), key: 'actions', width: 160, render: (_: unknown, r: SupplierWithBalance) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/suppliers/${r.id}`)}>{t('view')}</Button>
          <Button size="small" onClick={() => openEdit(r)}>{t('edit')}</Button>
          <Popconfirm title={t('confirm_delete')} onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger>{t('delete')}</Button>
          </Popconfirm>
        </Space>
      ) }
  ]

  return (
    <div>
      <div className="page-header">
        <h2>{t('suppliers')}</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{t('add_supplier')}</Button>
      </div>
      <DataTable columns={columns} data={data} loading={loading} />
      <FormModal open={modalOpen} title={editing ? `${t('edit')} ${t('supplier')}` : `${t('add')} ${t('supplier')}`}
        onCancel={() => setModalOpen(false)} onOk={handleSave}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label={t('phone')}><Input /></Form.Item>
          <Form.Item name="address" label={t('address')}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="notes" label={t('notes')}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </FormModal>
    </div>
  )
}
