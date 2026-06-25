import { useEffect, useState } from 'react'
import { Form, Input, Select, Button, Card, message, Image } from 'antd'
import { SaveOutlined, UploadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { SettingsMap } from '../types'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [logo, setLogo] = useState<string | null>(null)

  useEffect(() => {
    window.api.settings.getAll().then(data => {
      form.setFieldsValue(data)
      setLogo(data.logo || null)
    })
  }, [form])

  const handleSave = async () => {
    const values = form.getFieldsValue()
    setLoading(true)
    try {
      await window.api.settings.setMany(values)
      if (values.language && values.language !== i18n.language) {
        i18n.changeLanguage(values.language)
      }
      message.success('Settings saved')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadLogo = async () => {
    const base64 = await window.api.settings.uploadLogo()
    if (base64) {
      setLogo(base64)
      form.setFieldsValue({ logo: base64 })
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h2>{t('settings')}</h2>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={loading}>{t('save')}</Button>
      </div>
      <Card>
        <Form form={form} layout="vertical">
          <Form.Item name="company_name" label={t('company_name')}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label={t('address')}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="phone" label={t('phone')}>
            <Input />
          </Form.Item>
          <Form.Item label={t('logo')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {logo && <Image src={logo} style={{ maxHeight: 80, maxWidth: 200 }} preview={false} />}
              <Button icon={<UploadOutlined />} onClick={handleUploadLogo}>Upload Logo</Button>
            </div>
          </Form.Item>
          <Form.Item name="invoice_paper_size" label={t('invoice_paper_size')}>
            <Select options={[
              { value: 'A4', label: 'A4 (210x297mm)' },
              { value: 'Letter', label: 'Letter (216x279mm)' },
              { value: 'A5', label: 'A5 (148x210mm)' }
            ]} />
          </Form.Item>
          <Form.Item name="language" label={t('language')}>
            <Select options={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'العربية' }
            ]} />
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
