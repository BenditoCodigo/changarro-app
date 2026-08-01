import { describe, it, expect } from 'vitest'
import { calculateReportData, filterSalesByPeriod } from './reportsService'
import type { Sale, Product } from '@/services/db'

describe('Reports Service - Calculations & Insights', () => {
  const mockProducts: Product[] = [
    { id: 'p1', name: 'Coca Cola 600ml', price: 20, category: 'PRODUCTO', unit: 'pieza', isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    { id: 'p2', name: 'Sabritas Sal 45g', price: 18, category: 'PRODUCTO', unit: 'pieza', isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  ]

  const now = new Date()
  const todayIso = now.toISOString()
  const yesterdayIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const mockSales: Sale[] = [
    {
      id: 's1',
      subtotal: 58,
      taxIncluded: false,
      taxRate: 0.16,
      taxAmount: 0,
      total: 58,
      paymentMethod: 'cash',
      createdAt: todayIso,
      items: [
        { productId: 'p1', productName: 'Coca Cola 600ml', quantity: 2, unitPrice: 20, subtotal: 40 },
        { productId: 'p2', productName: 'Sabritas Sal 45g', quantity: 1, unitPrice: 18, subtotal: 18 },
      ],
    },
    {
      id: 's2',
      subtotal: 20,
      taxIncluded: false,
      taxRate: 0.16,
      taxAmount: 0,
      total: 20,
      paymentMethod: 'card',
      createdAt: yesterdayIso,
      items: [
        { productId: 'p1', productName: 'Coca Cola 600ml', quantity: 1, unitPrice: 20, subtotal: 20 },
      ],
    },
  ]

  it('filters sales correctly by period', () => {
    const todaySales = filterSalesByPeriod(mockSales, 'today')
    expect(todaySales).toHaveLength(1)
    expect(todaySales[0]?.id).toBe('s1')

    const weekSales = filterSalesByPeriod(mockSales, 'week')
    expect(weekSales).toHaveLength(2)
  })

  it('calculates KPIs correctly for week period', () => {
    const report = calculateReportData(mockSales, mockProducts, 'week')

    expect(report.kpis.totalRevenue).toBe(78)
    expect(report.kpis.salesCount).toBe(2)
    expect(report.kpis.averageTicket).toBe(39)
    expect(report.kpis.cashTotal).toBe(58)
    expect(report.kpis.cardTotal).toBe(20)
    expect(report.kpis.cashPercentage).toBe(74)
    expect(report.kpis.cardPercentage).toBe(26)
  })

  it('identifies top product correctly', () => {
    const report = calculateReportData(mockSales, mockProducts, 'week')

    expect(report.insights.topProduct).not.toBeNull()
    expect(report.insights.topProduct?.name).toBe('Coca Cola 600ml')
    expect(report.insights.topProduct?.quantity).toBe(3)
    expect(report.insights.topProduct?.revenue).toBe(60)
  })

  it('ranks top products array by quantity sold', () => {
    const report = calculateReportData(mockSales, mockProducts, 'week')

    expect(report.topProducts).toHaveLength(2)
    expect(report.topProducts[0]?.productName).toBe('Coca Cola 600ml')
    expect(report.topProducts[1]?.productName).toBe('Sabritas Sal 45g')
  })
})
