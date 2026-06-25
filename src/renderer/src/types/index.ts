export interface Product {
  id: number
  code: string
  name: string
  selling_price: number
  is_active: number
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: number
  invoice_number: string
  invoice_date: string
  subtotal: number
  total: number
  notes: string | null
  created_at: string
  items?: InvoiceItem[]
}

export interface InvoiceItem {
  id: number
  invoice_id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  total: number
  line_sort: number
}

export interface ImportResult {
  imported: number
  updated: number
  failed: number
  errors: string[]
}

export interface SettingsMap {
  [key: string]: string
}

export interface DashboardSummary {
  todayCount: number
  todayTotal: number
  monthTotal: number
  lastInvoice: { invoice_number: string; total: number; created_at: string } | undefined
}

declare global {
  interface Window {
    api: {
      printInvoice: (html: string) => Promise<void>
      products: {
        list: () => Promise<Product[]>
        search: (q: string) => Promise<Product[]>
        get: (id: number) => Promise<Product | undefined>
        create: (data: Partial<Product>) => Promise<Product>
        update: (id: number, data: Partial<Product>) => Promise<Product | undefined>
        delete: (id: number) => Promise<boolean>
        importCsv: () => Promise<ImportResult>
      }
      invoices: {
        list: () => Promise<Invoice[]>
        search: (q: string) => Promise<Invoice[]>
        get: (id: number) => Promise<Invoice>
        create: (data: any) => Promise<Invoice>
        update: (id: number, data: any) => Promise<Invoice>
        delete: (id: number) => Promise<boolean>
      }
      settings: {
        getAll: () => Promise<SettingsMap>
        set: (key: string, value: string) => Promise<void>
        setMany: (data: SettingsMap) => Promise<void>
        uploadLogo: () => Promise<string | null>
      }
      dashboard: {
        summary: () => Promise<DashboardSummary>
      }
    }
  }
}
