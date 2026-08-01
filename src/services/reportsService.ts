import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
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

  // 1. KPIs
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

    // Day aggregation
    const existingDay = daySalesMap.get(dateStr) || { dayName, dateStr, total: 0, count: 0 }
    existingDay.total += sale.total
    existingDay.count += 1
    daySalesMap.set(dateStr, existingDay)

    // Hour aggregation
    const hour = d.getHours()
    hourCountMap.set(hour, (hourCountMap.get(hour) || 0) + 1)

    // Product aggregation
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

  // 2. Top Products
  const topProductsList: TopProductItem[] = Array.from(productAggMap.entries())
    .map(([productId, val]) => ({
      productId,
      productName: val.name,
      quantity: val.quantity,
      revenue: val.revenue,
    }))
    .sort((a, b) => b.quantity - a.quantity)

  // 3. Human Insights
  // Top product
  const topProduct = topProductsList.length > 0 ? topProductsList[0]! : null

  // Busiest day
  let busiestDay: { dayName: string; total: number } | null = null
  let maxDayTotal = -1
  for (const dayEntry of daySalesMap.values()) {
    if (dayEntry.total > maxDayTotal) {
      maxDayTotal = dayEntry.total
      busiestDay = { dayName: dayEntry.dayName, total: dayEntry.total }
    }
  }

  // Peak hour
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

  // 4. Trend (Last 7 days or days in period)
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
      dayLabel: dayLabel.slice(0, 3), // e.g. "Sáb", "Dom"
      total: dayData.total,
      count: dayData.count,
      isPeak: false,
    })
  }

  // Mark peak in trend
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
 * Generate Excel Report (.xlsx) matching Changarro brand identity
 */
export async function exportReportToExcel(
  reportData: ReportData,
  allProducts: Product[],
): Promise<void> {
  const writeExcelFile = (await import('write-excel-file/browser')).default

  const HEADER_BG = '#2a2a38'
  const HEADER_TEXT_COLOR = '#ffffff'
  const ACCENT_COLOR = '#4f46e5'

  // SHEET 1: Resumen e Insights
  const sheet1Data: Array<Array<unknown>> = [
    // Title
    [{ value: 'REPORTE EJECUTIVO Y RESUMEN DE VENTAS - CHANGARRO', fontStyle: 'italic', fontWeight: 'bold', fontSize: 14, color: ACCENT_COLOR }],
    [{ value: `Período: ${reportData.periodLabel} | Generado: ${new Date().toLocaleDateString('es-MX')}`, fontSize: 10, color: '#666666' }],
    [],
    // KPIs section
    [{ value: 'INDICADORES PRINCIPALES (KPIS)', fontWeight: 'bold', fontSize: 12, backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR }],
    [{ value: 'Total Cobrado:', fontWeight: 'bold' }, { value: reportData.kpis.totalRevenue, format: '$#,##0.00' }],
    [{ value: 'Compras Atendidas:', fontWeight: 'bold' }, { value: reportData.kpis.salesCount }],
    [{ value: 'Ticket Promedio:', fontWeight: 'bold' }, { value: reportData.kpis.averageTicket, format: '$#,##0.00' }],
    [{ value: 'Ventas en Efectivo:', fontWeight: 'bold' }, { value: reportData.kpis.cashTotal, format: '$#,##0.00' }, { value: `${reportData.kpis.cashPercentage}%` }],
    [{ value: 'Ventas con Tarjeta:', fontWeight: 'bold' }, { value: reportData.kpis.cardTotal, format: '$#,##0.00' }, { value: `${reportData.kpis.cardPercentage}%` }],
    [{ value: 'Ventas con Transferencia:', fontWeight: 'bold' }, { value: reportData.kpis.transferTotal, format: '$#,##0.00' }, { value: `${reportData.kpis.transferPercentage}%` }],
    [],
    // Insights section
    [{ value: 'INSIGHTS DEL NEGOCIO', fontWeight: 'bold', fontSize: 12, backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR }],
    [
      { value: 'Producto Estrella:', fontWeight: 'bold' },
      {
        value: reportData.insights.topProduct
          ? `${reportData.insights.topProduct.name} (${reportData.insights.topProduct.quantity} piezas vendidas)`
          : 'Sin ventas registradas',
      },
    ],
    [
      { value: 'Día Más Fuerte:', fontWeight: 'bold' },
      {
        value: reportData.insights.busiestDay
          ? `${reportData.insights.busiestDay.dayName} ($${reportData.insights.busiestDay.total.toFixed(2)})`
          : 'Sin ventas registradas',
      },
    ],
    [
      { value: 'Hora Pico con Más Movimiento:', fontWeight: 'bold' },
      {
        value: reportData.insights.peakHour
          ? `${reportData.insights.peakHour.hourRange} (${reportData.insights.peakHour.count} ventas)`
          : 'Sin ventas registradas',
      },
    ],
    [],
    // Top 10 Table
    [{ value: 'TOP 10 PRODUCTOS MÁS VENDIDOS', fontWeight: 'bold', fontSize: 12, backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR }],
    [
      { value: 'Posición', fontWeight: 'bold', backgroundColor: '#e2e8f0' },
      { value: 'Producto', fontWeight: 'bold', backgroundColor: '#e2e8f0' },
      { value: 'Unidades Vendidas', fontWeight: 'bold', backgroundColor: '#e2e8f0' },
      { value: 'Ingresos Totales', fontWeight: 'bold', backgroundColor: '#e2e8f0' },
    ],
  ]

  reportData.topProducts.slice(0, 10).forEach((item, index) => {
    sheet1Data.push([
      { value: `#${index + 1}` },
      { value: item.productName },
      { value: item.quantity },
      { value: item.revenue, format: '$#,##0.00' },
    ])
  })

  // SHEET 2: Detalle de Ventas
  const sheet2Data: Array<Array<unknown>> = [
    [
      { value: 'ID Venta', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'Fecha y Hora', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'Producto', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'Cantidad', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'Precio Unitario', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'Subtotal', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'Método de Pago', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'ID Turno', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
    ],
  ]

  for (const sale of reportData.filteredSales) {
    const formattedDate = new Date(sale.createdAt).toLocaleString('es-MX')
    const paymentLabel =
      sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'

    for (const item of sale.items) {
      sheet2Data.push([
        { value: sale.id.slice(0, 8) },
        { value: formattedDate },
        { value: item.productName },
        { value: item.quantity },
        { value: item.unitPrice, format: '$#,##0.00' },
        { value: item.subtotal, format: '$#,##0.00' },
        { value: paymentLabel },
        { value: sale.shiftId ? `Turno #${sale.shiftId}` : 'N/A' },
      ])
    }
  }

  // SHEET 3: Inventario Actual
  const sheet3Data: Array<Array<unknown>> = [
    [
      { value: 'ID Producto', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'Nombre', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'Categoría', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'Unidad', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'Precio de Venta', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'Código de Barras', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
      { value: 'Estado', fontWeight: 'bold', backgroundColor: HEADER_BG, color: HEADER_TEXT_COLOR },
    ],
  ]

  for (const p of allProducts) {
    sheet3Data.push([
      { value: p.id.slice(0, 8) },
      { value: p.name },
      { value: p.category },
      { value: p.unit },
      { value: p.price, format: '$#,##0.00' },
      { value: p.barcode || 'N/A' },
      { value: p.isActive ? 'Activo' : 'Inactivo' },
    ])
  }

  // Generate Excel file blob/buffer
  const sheets = [
    sheet1Data as Array<Array<{ value: unknown; format?: string; fontWeight?: string; fontSize?: number; color?: string; backgroundColor?: string }>>,
    sheet2Data as Array<Array<{ value: unknown; format?: string; fontWeight?: string; fontSize?: number; color?: string; backgroundColor?: string }>>,
    sheet3Data as Array<Array<{ value: unknown; format?: string; fontWeight?: string; fontSize?: number; color?: string; backgroundColor?: string }>>,
  ]

  const fileBlob = await writeExcelFile(sheets, {
    sheets: ['Resumen e Insights', 'Detalle de Ventas', 'Inventario'],
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
