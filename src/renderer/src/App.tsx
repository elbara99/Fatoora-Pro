import { lazy, Suspense, useEffect, useMemo } from 'react'
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { ConfigProvider, theme, Spin } from 'antd'
import enUS from 'antd/locale/en_US'
import arEG from 'antd/locale/ar_EG'
import { useTranslation } from 'react-i18next'
import AppLayout from './components/AppLayout'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Products = lazy(() => import('./pages/Products'))
const Suppliers = lazy(() => import('./pages/Suppliers'))
const SupplierDetails = lazy(() => import('./pages/SupplierDetails'))
const NewInvoice = lazy(() => import('./pages/NewInvoice'))
const InvoiceHistory = lazy(() => import('./pages/InvoiceHistory'))
const Settings = lazy(() => import('./pages/Settings'))
const About = lazy(() => import('./pages/About'))

function RedirectToNewInvoice() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/new-invoice') }, [])
  return null
}

function PageLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Spin size="large" />
    </div>
  )
}

export default function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    const timer = setTimeout(() => {
      window.api.settings.getAll().then(s => {
        if (s.language && s.language !== i18n.language) {
          i18n.changeLanguage(s.language)
        }
      }).catch(() => {})
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
  const antdLocale = useMemo(() => i18n.language === 'ar' ? arEG : enUS, [i18n.language])

  return (
    <ConfigProvider locale={antdLocale} direction={dir} theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#1677ff' } }}>
      <div dir={dir}>
        <HashRouter>
          <AppLayout>
            <Suspense fallback={<PageLoading />}>
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
            </Suspense>
          </AppLayout>
        </HashRouter>
      </div>
    </ConfigProvider>
  )
}
