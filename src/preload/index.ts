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
    get: (id: number) => ipcRenderer.invoke('invoices:get', id),
    create: (data: any) => ipcRenderer.invoke('invoices:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('invoices:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('invoices:delete', id)
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
