import { ReactNode } from 'react'
import { Modal, Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  title: string
  onCancel: () => void
  onOk: () => void
  loading?: boolean
  width?: number
  children: ReactNode
}

export default function FormModal({ open, title, onCancel, onOk, loading, width = 640, children }: Props) {
  const { t } = useTranslation()
  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      width={width}
      footer={
        <Space>
          <Button onClick={onCancel}>{t('cancel')}</Button>
          <Button type="primary" loading={loading} onClick={onOk}>{t('save')}</Button>
        </Space>
      }
      destroyOnClose
    >
      {children}
    </Modal>
  )
}
