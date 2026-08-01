import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type ExcelJS from 'exceljs'
import type { Sale, Product } from '@/services/db'

export type ReportPeriod = 'today' | 'week' | 'month' | 'all'

export interface KpiMetrics {
  totalRevenue: number
  salesCount: number
  averageTicket: number
  cashTotal: number
  cardTotal: number
  transferTotal: number
  cashPercentage: number
  cardPercentage: number
  transferPercentage: number
}

export interface TopProductItem {
  productId: string
  productName: string
  quantity: number
  revenue: number
}

export interface DailyTrendItem {
  dateStr: string
  dayLabel: string
  total: number
  count: number
  isPeak: boolean
}

export interface HumanInsights {
  topProduct: { name: string; quantity: number; revenue: number } | null
  busiestDay: { dayName: string; total: number } | null
  peakHour: { hourRange: string; count: number } | null
}

export interface ReportData {
  period: ReportPeriod
  periodLabel: string
  kpis: KpiMetrics
  insights: HumanInsights
  weeklyTrend: DailyTrendItem[]
  topProducts: TopProductItem[]
  filteredSales: Sale[]
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function filterSalesByPeriod(sales: Sale[], period: ReportPeriod): Sale[] {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  return sales.filter((s) => {
    const saleTime = new Date(s.createdAt).getTime()
    if (period === 'today') {
      return saleTime >= startOfToday
    }
    if (period === 'week') {
      const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000
      return saleTime >= sevenDaysAgo
    }
    if (period === 'month') {
      const thirtyDaysAgo = startOfToday - 29 * 24 * 60 * 60 * 1000
      return saleTime >= thirtyDaysAgo
    }
    return true
  })
}

export function calculateReportData(
  allSales: Sale[],
  allProducts: Product[],
  period: ReportPeriod,
): ReportData {
  const filteredSales = filterSalesByPeriod(allSales, period)

  let totalRevenue = 0
  let cashTotal = 0
  let cardTotal = 0
  let transferTotal = 0

  const productAggMap = new Map<string, { name: string; quantity: number; revenue: number }>()
  const daySalesMap = new Map<string, { dayName: string; dateStr: string; total: number; count: number }>()
  const hourCountMap = new Map<number, number>()

  for (const sale of filteredSales) {
    totalRevenue += sale.total

    if (sale.paymentMethod === 'cash') cashTotal += sale.total
    else if (sale.paymentMethod === 'card') cardTotal += sale.total
    else if (sale.paymentMethod === 'transfer') transferTotal += sale.total

    const d = new Date(sale.createdAt)
    const dayName = DAY_NAMES[d.getDay()] || 'Desconocido'
    const dateStr = d.toISOString().split('T')[0] || ''

    const existingDay = daySalesMap.get(dateStr) || { dayName, dateStr, total: 0, count: 0 }
    existingDay.total += sale.total
    existingDay.count += 1
    daySalesMap.set(dateStr, existingDay)

    const hour = d.getHours()
    hourCountMap.set(hour, (hourCountMap.get(hour) || 0) + 1)

    for (const item of sale.items) {
      const key = item.productId || item.productName
      const existing = productAggMap.get(key) || {
        name: item.productName,
        quantity: 0,
        revenue: 0,
      }
      existing.quantity += item.quantity
      existing.revenue += item.subtotal
      productAggMap.set(key, existing)
    }
  }

  const salesCount = filteredSales.length
  const averageTicket = salesCount > 0 ? totalRevenue / salesCount : 0

  const kpis: KpiMetrics = {
    totalRevenue,
    salesCount,
    averageTicket,
    cashTotal,
    cardTotal,
    transferTotal,
    cashPercentage: totalRevenue > 0 ? Math.round((cashTotal / totalRevenue) * 100) : 0,
    cardPercentage: totalRevenue > 0 ? Math.round((cardTotal / totalRevenue) * 100) : 0,
    transferPercentage: totalRevenue > 0 ? Math.round((transferTotal / totalRevenue) * 100) : 0,
  }

  const topProductsList: TopProductItem[] = Array.from(productAggMap.entries())
    .map(([productId, val]) => ({
      productId,
      productName: val.name,
      quantity: val.quantity,
      revenue: val.revenue,
    }))
    .sort((a, b) => b.quantity - a.quantity)

  const topProduct = topProductsList.length > 0 ? topProductsList[0]! : null

  let busiestDay: { dayName: string; total: number } | null = null
  let maxDayTotal = -1
  for (const dayEntry of daySalesMap.values()) {
    if (dayEntry.total > maxDayTotal) {
      maxDayTotal = dayEntry.total
      busiestDay = { dayName: dayEntry.dayName, total: dayEntry.total }
    }
  }

  let peakHour: { hourRange: string; count: number } | null = null
  let maxHourCount = -1
  for (const [hour, count] of hourCountMap.entries()) {
    if (count > maxHourCount) {
      maxHourCount = count
      const startH = hour % 12 === 0 ? 12 : hour % 12
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const endHour = (hour + 1) % 24
      const endH = endHour % 12 === 0 ? 12 : endHour % 12
      const endAmpm = endHour >= 12 ? 'PM' : 'AM'
      peakHour = {
        hourRange: `${startH}:00 ${ampm} - ${endH}:00 ${endAmpm}`,
        count,
      }
    }
  }

  const now = new Date()
  const trendItems: DailyTrendItem[] = []
  let maxTrendTotal = 0

  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const dateStr = targetDate.toISOString().split('T')[0] || ''
    const dayLabel = DAY_NAMES[targetDate.getDay()] || ''

    const dayData = daySalesMap.get(dateStr) || { dayName: dayLabel, dateStr, total: 0, count: 0 }
    if (dayData.total > maxTrendTotal) {
      maxTrendTotal = dayData.total
    }
    trendItems.push({
      dateStr,
      dayLabel: dayLabel.slice(0, 3),
      total: dayData.total,
      count: dayData.count,
      isPeak: false,
    })
  }

  if (maxTrendTotal > 0) {
    for (const item of trendItems) {
      if (item.total === maxTrendTotal) {
        item.isPeak = true
        break
      }
    }
  }

  const periodLabels: Record<ReportPeriod, string> = {
    today: 'Hoy',
    week: 'Esta Semana',
    month: 'Este Mes',
    all: 'Todo el Histórico',
  }

  return {
    period,
    periodLabel: periodLabels[period],
    kpis,
    insights: {
      topProduct: topProduct
        ? { name: topProduct.productName, quantity: topProduct.quantity, revenue: topProduct.revenue }
        : null,
      busiestDay,
      peakHour,
    },
    weeklyTrend: trendItems,
    topProducts: topProductsList.slice(0, 5),
    filteredSales,
  }
}

/**
 * Render weekly trend chart to Base64 PNG image using an offscreen canvas
 */
export function generateChartImageBase64(trendItems: DailyTrendItem[]): string | null {
  if (typeof document === 'undefined') return null

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 320
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Background
    ctx.fillStyle = '#1c1b22'
    ctx.beginPath()
    ctx.roundRect(0, 0, canvas.width, canvas.height, 24)
    ctx.fill()

    // Title
    ctx.fillStyle = '#c5c5d8'
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif'
    ctx.fillText('TENDENCIA DE VENTAS SEMANAL ($ MXN)', 32, 42)

    const maxTotal = trendItems.reduce((max, item) => Math.max(max, item.total), 1)
    const chartBottom = 260
    const chartHeight = 170
    const barWidth = 44
    const spacing = (canvas.width - 64 - trendItems.length * barWidth) / (trendItems.length - 1)

    trendItems.forEach((item, index) => {
      const x = 32 + index * (barWidth + spacing)
      const heightRatio = item.total / maxTotal
      const barH = Math.max(12, Math.round(chartHeight * heightRatio))
      const y = chartBottom - barH

      // Bar fill
      ctx.fillStyle = item.isPeak ? '#c5c5d8' : '#353545'
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barH, [12, 12, 6, 6])
      ctx.fill()

      // Amount label top
      ctx.fillStyle = item.isPeak ? '#ffffff' : '#9e9eb0'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`$${Math.round(item.total)}`, x + barWidth / 2, y - 8)

      // Day label bottom
      ctx.fillStyle = item.isPeak ? '#c5c5d8' : '#88889c'
      ctx.font = item.isPeak ? 'bold 13px sans-serif' : '13px sans-serif'
      ctx.fillText(item.dayLabel + (item.isPeak ? ' ⭐' : ''), x + barWidth / 2, chartBottom + 24)
    })

    return canvas.toDataURL('image/png')
  } catch (e) {
    console.warn('Error generating chart image:', e)
    return null
  }
}

/**
 * Generate Excel Report (.xlsx) with ExcelJS matching Changarro brand identity + embedded Chart image
 */
export async function exportReportToExcel(
  reportData: ReportData,
  allProducts: Product[],
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Changarro App'
  workbook.created = new Date()

  const HEADER_FILL: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2A2A38' },
  }

  const HEADER_FONT: Partial<ExcelJS.Font> = {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  }

  // SHEET 1: Resumen de Ventas
  const sheet1 = workbook.addWorksheet('Resumen de Ventas')
  sheet1.views = [{ showGridLines: true }]

  sheet1.columns = [
    { width: 30 },
    { width: 35 },
    { width: 20 },
    { width: 20 },
  ]

  // Title Block
  const titleRow = sheet1.addRow(['REPORTE Y RESUMEN DE VENTAS - CHANGARRO'])
  titleRow.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF4F46E5' } }

  const periodRow = sheet1.addRow([`Período: ${reportData.periodLabel} | Fecha: ${new Date().toLocaleDateString('es-MX')}`])
  periodRow.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } }
  sheet1.addRow([])

  // Section 1: KPIs
  const kpiHeader = sheet1.addRow(['DATOS CLAVE DEL NEGOCIO (KPIS)'])
  kpiHeader.getCell(1).fill = HEADER_FILL
  kpiHeader.getCell(1).font = HEADER_FONT

  const row1 = sheet1.addRow(['Total Cobrado:', reportData.kpis.totalRevenue])
  row1.getCell(1).font = { bold: true }
  row1.getCell(2).numFmt = '"$"#,##0.00'

  const row2 = sheet1.addRow(['Compras Atendidas:', reportData.kpis.salesCount])
  row2.getCell(1).font = { bold: true }

  const row3 = sheet1.addRow(['Ticket Promedio por Cliente:', reportData.kpis.averageTicket])
  row3.getCell(1).font = { bold: true }
  row3.getCell(2).numFmt = '"$"#,##0.00'

  const row4 = sheet1.addRow(['Ventas en Efectivo:', reportData.kpis.cashTotal, `${reportData.kpis.cashPercentage}%`])
  row4.getCell(1).font = { bold: true }
  row4.getCell(2).numFmt = '"$"#,##0.00'

  const row5 = sheet1.addRow(['Ventas con Tarjeta:', reportData.kpis.cardTotal, `${reportData.kpis.cardPercentage}%`])
  row5.getCell(1).font = { bold: true }
  row5.getCell(2).numFmt = '"$"#,##0.00'

  sheet1.addRow([])

  // Section 2: Human Insights
  const insightHeader = sheet1.addRow(['CONCLUSIONES Y PUNTOS CLAVE'])
  insightHeader.getCell(1).fill = HEADER_FILL
  insightHeader.getCell(1).font = HEADER_FONT

  sheet1.addRow([
    'Producto Estrella:',
    reportData.insights.topProduct
      ? `${reportData.insights.topProduct.name} (${reportData.insights.topProduct.quantity} pzas)`
      : 'Sin datos',
  ])
  sheet1.addRow([
    'Día Más Fuerte de Ventas:',
    reportData.insights.busiestDay
      ? `${reportData.insights.busiestDay.dayName} ($${reportData.insights.busiestDay.total.toFixed(2)})`
      : 'Sin datos',
  ])
  sheet1.addRow([
    'Hora Pico con Más Movimiento:',
    reportData.insights.peakHour
      ? `${reportData.insights.peakHour.hourRange} (${reportData.insights.peakHour.count} compras)`
      : 'Sin datos',
  ])

  sheet1.addRow([])
  sheet1.addRow([])

  // Section 3: Embed Chart Image
  const chartImageBase64 = generateChartImageBase64(reportData.weeklyTrend)
  if (chartImageBase64) {
    const imageId = workbook.addImage({
      base64: chartImageBase64,
      extension: 'png',
    })
    sheet1.addImage(imageId, {
      tl: { col: 0, row: 15 },
      ext: { width: 560, height: 280 },
    })

    // Add spacing for image height (~14 rows)
    for (let i = 0; i < 15; i++) {
      sheet1.addRow([])
    }
  }

  // Section 4: Top 10 Products Table
  const topHeader = sheet1.addRow(['TOP 10 PRODUCTOS MÁS VENDIDOS'])
  topHeader.getCell(1).fill = HEADER_FILL
  topHeader.getCell(1).font = HEADER_FONT

  const tableHeader = sheet1.addRow(['Posición', 'Producto', 'Unidades Vendidas', 'Total Ingresado'])
  tableHeader.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    cell.font = { bold: true }
  })

  reportData.topProducts.slice(0, 10).forEach((item, index) => {
    const r = sheet1.addRow([`#${index + 1}`, item.productName, item.quantity, item.revenue])
    r.getCell(4).numFmt = '"$"#,##0.00'
  })

  // SHEET 2: Detalle de Ventas
  const sheet2 = workbook.addWorksheet('Detalle de Ventas')
  sheet2.views = [{ showGridLines: true }]
  sheet2.columns = [
    { width: 14 },
    { width: 22 },
    { width: 30 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
  ]

  const s2Header = sheet2.addRow([
    'ID Venta',
    'Fecha y Hora',
    'Producto',
    'Cantidad',
    'Precio Unitario',
    'Subtotal',
    'Método de Pago',
    'ID Turno',
  ])
  s2Header.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
  })

  for (const sale of reportData.filteredSales) {
    const formattedDate = new Date(sale.createdAt).toLocaleString('es-MX')
    const paymentLabel =
      sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'

    for (const item of sale.items) {
      const r = sheet2.addRow([
        sale.id.slice(0, 8),
        formattedDate,
        item.productName,
        item.quantity,
        item.unitPrice,
        item.subtotal,
        paymentLabel,
        sale.shiftId ? `Turno #${sale.shiftId}` : 'N/A',
      ])
      r.getCell(5).numFmt = '"$"#,##0.00'
      r.getCell(6).numFmt = '"$"#,##0.00'
    }
  }

  // SHEET 3: Inventario
  const sheet3 = workbook.addWorksheet('Inventario')
  sheet3.views = [{ showGridLines: true }]
  sheet3.columns = [
    { width: 14 },
    { width: 30 },
    { width: 18 },
    { width: 12 },
    { width: 16 },
    { width: 22 },
    { width: 12 },
  ]

  const s3Header = sheet3.addRow([
    'ID Producto',
    'Nombre',
    'Categoría',
    'Unidad',
    'Precio de Venta',
    'Código de Barras',
    'Estado',
  ])
  s3Header.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
  })

  for (const p of allProducts) {
    const r = sheet3.addRow([
      p.id.slice(0, 8),
      p.name,
      p.category,
      p.unit,
      p.price,
      p.barcode || 'N/A',
      p.isActive ? 'Activo' : 'Inactivo',
    ])
    r.getCell(5).numFmt = '"$"#,##0.00'
  }

  // Export buffer & blob
  const buffer = await workbook.xlsx.writeBuffer()
  const fileBlob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const filename = `Reporte_Changarro_${reportData.period}_${new Date().toISOString().split('T')[0]}.xlsx`

  if (Capacitor.isNativePlatform()) {
    // Native Mobile Save & Share
    const reader = new FileReader()
    reader.readAsDataURL(fileBlob)
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1]
      if (base64Data) {
        const savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
        })
        await Share.share({
          title: 'Reporte de Ventas Changarro',
          text: `Reporte de ventas de Changarro (${reportData.periodLabel})`,
          url: savedFile.uri,
          dialogTitle: 'Compartir reporte en Excel',
        })
      }
    }
  } else {
    // Web Browser Direct Download
    const blobUrl = URL.createObjectURL(fileBlob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  }
}
