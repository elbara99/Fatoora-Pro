export interface Product {
  id: number
  code: string
  name: string
  selling_price: number
  is_active: number
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: number
  name: string
  phone: string
  address: string
  notes: string
  created_at: string
  updated_at: string
}

export interface SupplierWithBalance extends Supplier {
  invoice_count: number
  total_purchases: number
  balance: number
  last_invoice_date: string | null
}

export interface SupplierDashboard {
  totalSuppliers: number
  totalBalance: number
  highestBalance: { name: string; balance: number } | null
  latestSuppliers: Supplier[]
  latestInvoices: { id: number; invoice_number: string; total: number; supplier_name: string; created_at: string }[]
  top5ByBalance: { name: string; balance: number }[]
}

export interface Invoice {
  id: number
  invoice_number: string
  invoice_date: string
  supplier_id: number | null
  supplier_name: string
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
  lastInvoice: { invoice_number: string; total: number; created_at: string; supplier_name: string } | undefined
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
        searchAdvanced: (filters: { q?: string; supplierId?: number; dateFrom?: string; dateTo?: string; amountMin?: number; amountMax?: number }) => Promise<Invoice[]>
        get: (id: number) => Promise<Invoice>
        create: (data: any) => Promise<Invoice>
        update: (id: number, data: any) => Promise<Invoice>
        delete: (id: number) => Promise<boolean>
        getBySupplier: (supplierId: number) => Promise<Invoice[]>
        globalBalance: (excludeId?: number) => Promise<{ previousBalance: number; newBalance: number }>
        listAllByDate: () => Promise<Invoice[]>
      }
      suppliers: {
        list: () => Promise<Supplier[]>
        listWithBalances: () => Promise<SupplierWithBalance[]>
        search: (q: string) => Promise<Supplier[]>
        get: (id: number) => Promise<Supplier | undefined>
        getWithBalance: (id: number) => Promise<SupplierWithBalance | undefined>
        getInvoices: (id: number, q?: string) => Promise<Invoice[]>
        create: (data: Partial<Supplier>) => Promise<{ success: true; data: Supplier } | { success: false; error: string; existingId: number; existingName: string }>
        createOrGet: (name: string) => Promise<Supplier>
        update: (id: number, data: Partial<Supplier>) => Promise<Supplier | undefined>
        delete: (id: number) => Promise<boolean>
        dashboard: () => Promise<SupplierDashboard>
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
