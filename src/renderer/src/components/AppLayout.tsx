import { ReactNode } from 'react'
import { Layout, Menu, Select } from 'antd'
import {
  DashboardOutlined, ShopOutlined, FileTextOutlined,
  UnorderedListOutlined, SettingOutlined, InfoCircleOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const { Sider, Content } = Layout

export default function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: t('dashboard') },
    { key: '/products', icon: <ShopOutlined />, label: t('products') },
    { key: '/new-invoice', icon: <FileTextOutlined />, label: t('new_invoice') },
    { key: '/invoices', icon: <UnorderedListOutlined />, label: t('invoice_history') },
    { key: '/settings', icon: <SettingOutlined />, label: t('settings') },
    { key: '/about', icon: <InfoCircleOutlined />, label: t('about') }
  ]

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider collapsible theme="light" width={200} style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, borderBottom: '1px solid #f0f0f0' }}>
          Fatoora Pro
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Layout.Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '0 24px', height: 48 }}>
          <Select
            value={i18n.language}
            size="small"
            style={{ width: 100 }}
            onChange={(lng) => i18n.changeLanguage(lng)}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'العربية' }
            ]}
          />
        </Layout.Header>
        <Content style={{ padding: '24px 24px 0 24px', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>{children}</div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#bbb', padding: '12px 0 8px 0', borderTop: '1px solid #f0f0f0', marginTop: 24 }}>
            {t('footer_dev')} &mdash; Fatoora Pro
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
