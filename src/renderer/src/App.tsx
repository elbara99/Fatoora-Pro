import { useEffect, useMemo } from 'react'
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import enUS from 'antd/locale/en_US'
import arEG from 'antd/locale/ar_EG'
import { useTranslation } from 'react-i18next'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Suppliers from './pages/Suppliers'
import SupplierDetails from './pages/SupplierDetails'
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

  useEffect(() => {
    window.api.settings.getAll().then(s => {
      if (s.language && s.language !== i18n.language) {
        i18n.changeLanguage(s.language)
      }
    }).catch(() => {})
  }, [])

  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
  const antdLocale = useMemo(() => i18n.language === 'ar' ? arEG : enUS, [i18n.language])

  return (
    <ConfigProvider locale={antdLocale} direction={dir} theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#1677ff' } }}>
      <div dir={dir}>
        <HashRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/suppliers/:id" element={<SupplierDetails />} />
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
