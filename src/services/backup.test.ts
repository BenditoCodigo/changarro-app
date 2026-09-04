import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { exportDatabase, importDatabaseMerge } from './backup'

describe('Backup Service - Payment Methods & CLABE Export/Import', () => {
  beforeEach(async () => {
    await db.settings.clear()
    await db.products.clear()
    await db.sales.clear()
    await db.cartItems.clear()
    await db.shifts.clear()
  })

  it('exports and imports paymentMethods and transferClabe correctly', async () => {
    // 1. Setup initial settings in DB
    await db.settings.put({
      id: 'app-settings',
      taxEnabled: true,
      taxRate: 0.16,
      businessName: 'Changarro Test',
      currency: 'MXN',
      shiftsEnabled: true,
      paymentMethods: {
        cash: true,
        card: true,
        transfer: true,
      },
      transferClabe: '123456789012345678',
    })

    // 2. Export database to JSON
    const exportedJson = await exportDatabase()
    const parsed = JSON.parse(exportedJson)

    expect(parsed.settings).toHaveLength(1)
    expect(parsed.settings[0].paymentMethods).toEqual({
      cash: true,
      card: true,
      transfer: true,
    })
    expect(parsed.settings[0].transferClabe).toBe('123456789012345678')

    // 3. Clear DB settings
    await db.settings.clear()
    const clearedSettings = await db.settings.get('app-settings')
    expect(clearedSettings).toBeUndefined()

    // 4. Import database JSON
    await importDatabaseMerge(exportedJson)

    // 5. Verify restored settings from DB
    const restoredSettings = await db.settings.get('app-settings')
    expect(restoredSettings).toBeDefined()
    expect(restoredSettings?.paymentMethods).toEqual({
      cash: true,
      card: true,
      transfer: true,
    })
    expect(restoredSettings?.transferClabe).toBe('123456789012345678')
  })
})
