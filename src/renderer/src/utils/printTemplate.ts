import { formatCurrency } from './format'

export interface PrintItem {
  name: string
  qty: number
  price: number
  total: number
}

export interface PrintLabels {
  invoiceTitle: string
  invoiceNo: string
  invoiceDate: string
  printDate: string
  supplierBoxTitle: string
  supplierName: string
  phone: string
  address: string
  notes: string
  colNo: string
  colProduct: string
  colQty: string
  colPrice: string
  colTotal: string
  subtotal: string
  previousBalance: string
  grandTotal: string
  newBalance: string
  thankYou: string
  programName: string
  versionLabel: string
  autoPrint: string
}

export interface PrintData {
  invoiceNumber: string
  invoiceDate: string
  supplierName: string
  supplierPhone: string
  supplierAddress: string
  supplierNotes: string
  items: PrintItem[]
  subtotal: number
  grandTotal: number
  previousBalance: number
  newBalance: number
  notes?: string | null
  companyName: string
  address: string
  phone: string
  logo: string
  language: string
  version: string
  labels: PrintLabels
}

function nbsp(text: string): string {
  return text.replace(/ /g, '\u00A0')
}

export function buildPrintHtml(data: PrintData): string {
  const dir = data.language === 'ar' ? 'rtl' : 'ltr'
  const align = data.language === 'ar' ? 'right' : 'left'

  const now = new Date()
  const printDateStr = now.toLocaleDateString(data.language === 'ar' ? 'ar-DZ' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const logoHtml = data.logo
    ? `<img src="${data.logo}" alt="" class="logo" />`
    : ''

  const lineHtml = data.items
    .map(
      (item, i) => `
      <tr${i % 2 === 1 ? ' class="alt"' : ''}>
        <td class="col-num">${i + 1}</td>
        <td class="col-name">${item.name}</td>
        <td class="col-qty">${item.qty}</td>
        <td class="col-price">${nbsp(formatCurrency(item.price))}</td>
        <td class="col-total">${nbsp(formatCurrency(item.total))}</td>
      </tr>`
    )
    .join('')

  const showSupplierBox = data.supplierName || data.supplierPhone || data.supplierAddress
  const supplierBoxHtml = showSupplierBox ? `
    <div class="supplier-box">
      <div class="supplier-title">${data.labels.supplierBoxTitle}</div>
      <table class="supplier-table">
        ${data.supplierName ? `<tr><td class="sl">${data.labels.supplierName}</td><td class="sv">${data.supplierName}</td></tr>` : ''}
        ${data.supplierPhone ? `<tr><td class="sl">${data.labels.phone}</td><td class="sv">${data.supplierPhone}</td></tr>` : ''}
        ${data.supplierAddress ? `<tr><td class="sl">${data.labels.address}</td><td class="sv">${data.supplierAddress}</td></tr>` : ''}
        ${data.supplierNotes ? `<tr><td class="sl">${data.labels.notes}</td><td class="sv">${data.supplierNotes}</td></tr>` : ''}
      </table>
    </div>` : ''

  const notesHtml = data.notes
    ? `<div class="notes"><strong>${data.labels.notes}:</strong> ${data.notes}</div>`
    : ''

  const hasBalance = data.previousBalance > 0 || data.newBalance > 0

  return `<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="utf-8">
<title>${data.labels.invoiceTitle} - ${data.invoiceNumber}</title>
<style>
  @page { size: A4; margin: 15mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Traditional Arabic', 'Arabic Typesetting', 'Noto Naskh Arabic', Arial, sans-serif;
    font-size: 10pt; line-height: 1.5; color: #2d2d2d;
    padding: 0; margin: 0;
    direction: ${dir};
    text-align: ${align};
  }
  .page { max-width: 190mm; margin: 0 auto; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 3px solid #1a3a5c; }
  .header .company { text-align: ${data.language === 'ar' ? 'right' : 'left'}; }
  .header .company img.logo { max-height: 60px; max-width: 140px; display: block; margin-bottom: 6px; ${data.language === 'ar' ? 'margin-right: 0; margin-left: auto;' : ''} }
  .header .company .cname { font-size: 14pt; font-weight: 700; color: #1a3a5c; margin-bottom: 2px; }
  .header .company .cdetail { font-size: 9pt; color: #666; }
  .header .inv-info { text-align: ${data.language === 'ar' ? 'left' : 'right'}; background: #f0f4f8; padding: 10px 14px; border-radius: 6px; min-width: 200px; }
  .header .inv-info .inv-title { font-size: 14pt; font-weight: 700; color: #1a3a5c; margin-bottom: 4px; }
  .header .inv-info .inv-meta { font-size: 9pt; color: #555; line-height: 1.6; }
  html[dir="rtl"] .header { flex-direction: row-reverse; }
  html[dir="rtl"] .header .inv-info { text-align: left; }

  .supplier-box { border: 1.5px solid #c8d6e5; border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; background: #f8fafc; }
  .supplier-title { font-size: 10pt; font-weight: 700; color: #1a3a5c; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #dde4ec; }
  .supplier-table { width: 100%; border-collapse: collapse; }
  .supplier-table td { padding: 2px 4px; font-size: 9.5pt; border: none; }
  .supplier-table td.sl { font-weight: 600; color: #555; width: 80px; }
  .supplier-table td.sv { color: #2d2d2d; }

  table.items { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  thead { display: table-header-group; }
  table.items th {
    background: #1a3a5c; color: #fff;
    font-weight: 700; font-size: 9pt;
    padding: 8px 6px;
    border: 1px solid #1a3a5c;
    text-align: ${align === 'right' ? 'right' : 'left'};
  }
  html[dir="rtl"] table.items th { text-align: right; }
  table.items td {
    padding: 6px;
    border: 1px solid #dde4ec;
    font-size: 9.5pt;
    vertical-align: middle;
  }
  table.items td.col-num { width: 32px; text-align: center; }
  table.items td.col-qty { text-align: center; }
  table.items td.col-price { text-align: left; direction: ltr; }
  table.items td.col-total { text-align: left; direction: ltr; font-weight: 600; }
  table.items td.col-name { text-align: ${align}; }
  html[dir="rtl"] table.items td.col-price,
  html[dir="rtl"] table.items td.col-total { text-align: left; }
  table.items th:nth-child(1) { width: 32px; text-align: center; }
  table.items th:nth-child(3) { text-align: center; }
  table.items th:nth-child(4) { text-align: center; }
  table.items th:nth-child(5) { text-align: center; }
  tbody tr { page-break-inside: avoid; }
  tbody tr.alt td { background: #f5f7fa; }

  .totals { ${data.language === 'ar' ? 'margin-right: auto; margin-left: 0;' : 'margin-left: auto; margin-right: 0;'} width: 340px; margin-top: 4px; margin-bottom: 14px; }
  .totals table { width: 100%; border-collapse: collapse; }
  .totals td { padding: 4px 8px; font-size: 9.5pt; border: none; }
  .totals td.label { text-align: ${data.language === 'ar' ? 'right' : 'left'}; font-weight: 600; color: #555; }
  .totals td.value { text-align: left; direction: ltr; }
  html[dir="rtl"] .totals td.value { text-align: left; }
  .totals .sep td { padding: 0; height: 1px; }
  .totals .sep div { border-top: 1px solid #dde4ec; }

  .totals .grand-row td { padding: 8px; font-weight: 700; }
  .totals .grand-row td.label { font-size: 11pt; color: #1a3a5c; }
  .totals .grand-row td.value { font-size: 12pt; color: #1a3a5c; }

  .totals .balance-row td { padding: 8px; font-weight: 700; background: #e8f0fe; border-radius: 4px; }
  .totals .balance-row td.label { font-size: 10pt; color: #1a3a5c; }
  .totals .balance-row td.value { font-size: 11pt; color: #1a3a5c; }

  .totals .highlight-box {
    background: #1a3a5c; color: #fff; border-radius: 4px; margin-top: 4px;
  }
  .totals .highlight-box td { padding: 8px 10px; color: #fff; border: none; }
  .totals .highlight-box td.label { font-size: 10pt; color: #fff; }
  .totals .highlight-box td.value { font-size: 13pt; font-weight: 700; }

  .notes { margin-top: 4px; margin-bottom: 14px; font-size: 9.5pt; color: #555; padding: 8px 10px; border: 1px solid #e8e8e8; background: #fafafa; border-radius: 4px; }

  .footer { text-align: center; padding-top: 12px; border-top: 2px solid #1a3a5c; margin-top: 10px; }
  .footer .thanks { font-size: 10pt; font-weight: 600; color: #1a3a5c; margin-bottom: 8px; }
  .footer .prog { font-size: 9pt; color: #555; margin-bottom: 2px; }
  .footer .prog strong { color: #1a3a5c; }
  .footer .version { font-size: 8.5pt; color: #999; margin-bottom: 1px; }
  .footer .auto-print { font-size: 8pt; color: #aaa; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="company">
      ${logoHtml}
      <div class="cname">${nbsp(data.companyName)}</div>
      ${data.address ? `<div class="cdetail">${nbsp(data.address)}</div>` : ''}
      ${data.phone ? `<div class="cdetail">${nbsp(data.phone)}</div>` : ''}
    </div>
    <div class="inv-info">
      <div class="inv-title">${nbsp(data.labels.invoiceTitle)}</div>
      <div class="inv-meta">
        ${data.labels.invoiceNo}: ${nbsp(data.invoiceNumber)}<br/>
        ${data.labels.invoiceDate}: ${nbsp(data.invoiceDate)}<br/>
        ${data.labels.printDate}: ${nbsp(printDateStr)}
      </div>
    </div>
  </div>

  ${supplierBoxHtml}

  <table class="items">
    <thead>
      <tr>
        <th>${data.labels.colNo}</th>
        <th>${data.labels.colProduct}</th>
        <th>${data.labels.colQty}</th>
        <th>${data.labels.colPrice}</th>
        <th>${data.labels.colTotal}</th>
      </tr>
    </thead>
    <tbody>
      ${lineHtml}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td class="label">${data.labels.subtotal}</td><td class="value">${nbsp(formatCurrency(data.subtotal))}</td></tr>
      ${hasBalance ? `<tr><td class="label">${data.labels.previousBalance}</td><td class="value">${nbsp(formatCurrency(data.previousBalance))}</td></tr>` : ''}
      <tr class="sep"><td colspan="2"><div></div></td></tr>
      <tr class="highlight-box"><td class="label">${data.labels.grandTotal}</td><td class="value">${nbsp(formatCurrency(data.grandTotal))}</td></tr>
      ${hasBalance ? `<tr class="balance-row"><td class="label">${data.labels.newBalance}</td><td class="value">${nbsp(formatCurrency(data.newBalance))}</td></tr>` : ''}
    </table>
  </div>

  ${notesHtml}

  <div class="footer">
    <div class="thanks">${data.labels.thankYou}</div>
    <div class="prog">${data.labels.programName} <strong>Fatoora Pro</strong></div>
    <div class="version">${data.labels.versionLabel} ${data.version}</div>
    <div class="auto-print">${data.labels.autoPrint}</div>
  </div>

</div>
</body>
</html>`
}
