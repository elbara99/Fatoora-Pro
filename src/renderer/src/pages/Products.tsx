import { useEffect, useState } from 'react'
import { Button, Form, Input, InputNumber, Space, Popconfirm, Modal, Alert, List, message } from 'antd'
import { PlusOutlined, ImportOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../utils/format'
import DataTable from '../components/ui/DataTable'
import FormModal from '../components/ui/FormModal'
import type { Product, ImportResult } from '../types'

export default function Products() {
  const { t } = useTranslation()
  const [data, setData] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form] = Form.useForm()
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)

  const fetch = () => {
    setLoading(true)
    window.api.products.list().then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (r: Product) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true) }

  const handleSave = async () => {
    const values = await form.validateFields()
    if (editing) await window.api.products.update(editing.id, values)
    else await window.api.products.create(values)
    setModalOpen(false)
    fetch()
  }

  const handleDelete = async (id: number) => {
    try {
      await window.api.products.delete(id)
      fetch()
    } catch (err) {
      message.error(String(err))
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try { setImportResult(await window.api.products.importCsv()); fetch() }
    finally { setImporting(false) }
  }

  const columns = [
    { title: t('code'), dataIndex: 'code', key: 'code', width: 120 },
    { title: t('name'), dataIndex: 'name', key: 'name' },
    { title: t('selling_price'), dataIndex: 'selling_price', key: 'price', width: 140, render: (v: number) => formatCurrency(v) },
    { title: t('actions'), key: 'actions', width: 140, render: (_: unknown, r: Product) => (
        <Space>
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
        <h2>{t('products')}</h2>
        <Space>
          <Button icon={<ImportOutlined />} onClick={handleImport} loading={importing}>{t('import_products')}</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{t('add')}</Button>
        </Space>
      </div>
      <DataTable columns={columns} data={data} loading={loading} />
      <FormModal open={modalOpen} title={editing ? `${t('edit')} ${t('product')}` : `${t('add')} ${t('product')}`}
        onCancel={() => setModalOpen(false)} onOk={handleSave}>
        <Form form={form} layout="vertical">
          {editing ? (
            <Form.Item name="code" label={t('code')}><Input disabled /></Form.Item>
          ) : (
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{t('code_auto')}</div>
          )}
          <Form.Item name="name" label={t('name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="selling_price" label={t('selling_price')} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </FormModal>
      <Modal open={!!importResult} title={t('import_results')} onCancel={() => setImportResult(null)}
        footer={<Button type="primary" onClick={() => setImportResult(null)}>{t('ok')}</Button>}>
        {importResult && (
          <>
            <Alert type={importResult.failed > 0 ? 'warning' : 'success'}
              message={<span>{t('imported')}: <strong>{importResult.imported}</strong> | {t('updated')}: <strong>{importResult.updated}</strong> | {t('failed')}: <strong>{importResult.failed}</strong></span>}
              style={{ marginBottom: 16 }} />
            {importResult.errors.length > 0 && (
              <List size="small" header={`${t('errors')}:`} dataSource={importResult.errors}
                renderItem={(item) => <List.Item style={{ color: '#ff4d4f' }}>{item}</List.Item>} />
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
