import { contextBridge, ipcRenderer } from 'electron'

const api = {
  printInvoice: (html: string) => ipcRenderer.invoke('print:invoice', html),
  products: {
    list: () => ipcRenderer.invoke('products:list'),
    search: (q: string) => ipcRenderer.invoke('products:search', q),
    get: (id: number) => ipcRenderer.invoke('products:get', id),
    create: (data: any) => ipcRenderer.invoke('products:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('products:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('products:delete', id),
    importCsv: () => ipcRenderer.invoke('products:importCsv')
  },
  invoices: {
    list: () => ipcRenderer.invoke('invoices:list'),
    search: (q: string) => ipcRenderer.invoke('invoices:search', q),
    searchAdvanced: (filters: any) => ipcRenderer.invoke('invoices:searchAdvanced', filters),
    get: (id: number) => ipcRenderer.invoke('invoices:get', id),
    create: (data: any) => ipcRenderer.invoke('invoices:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('invoices:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('invoices:delete', id),
    getBySupplier: (supplierId: number) => ipcRenderer.invoke('invoices:getBySupplier', supplierId),
    supplierBalance: (supplierId: number, excludeId?: number) => ipcRenderer.invoke('invoices:supplierBalance', supplierId, excludeId)
  },
  suppliers: {
    list: () => ipcRenderer.invoke('suppliers:list'),
    listWithBalances: () => ipcRenderer.invoke('suppliers:listWithBalances'),
    search: (q: string) => ipcRenderer.invoke('suppliers:search', q),
    get: (id: number) => ipcRenderer.invoke('suppliers:get', id),
    getWithBalance: (id: number) => ipcRenderer.invoke('suppliers:getWithBalance', id),
    getInvoices: (id: number, q?: string) => ipcRenderer.invoke('suppliers:getInvoices', id, q),
    create: (data: any) => ipcRenderer.invoke('suppliers:create', data),
    createOrGet: (name: string) => ipcRenderer.invoke('suppliers:createOrGet', name),
    update: (id: number, data: any) => ipcRenderer.invoke('suppliers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('suppliers:delete', id),
    dashboard: () => ipcRenderer.invoke('suppliers:dashboard')
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    setMany: (data: any) => ipcRenderer.invoke('settings:setMany', data),
    uploadLogo: () => ipcRenderer.invoke('settings:uploadLogo')
  },
  dashboard: {
    summary: () => ipcRenderer.invoke('dashboard:summary')
  }
}

contextBridge.exposeInMainWorld('api', api)
