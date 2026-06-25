import { useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import NewInvoice from './pages/NewInvoice'
import InvoiceHistory from './pages/InvoiceHistory'
import Settings from './pages/Settings'
import About from './pages/About'

function RedirectToNewInvoice() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/new-invoice') }, [])
  return null
}

export default function App() {
  const { i18n } = useTranslation()
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr'

  return (
    <ConfigProvider direction={dir} theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#1677ff' } }}>
      <div dir={dir}>
        <HashRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/new-invoice" element={<NewInvoice />} />
              <Route path="/invoices" element={<InvoiceHistory />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </AppLayout>
        </HashRouter>
      </div>
    </ConfigProvider>
  )
}
