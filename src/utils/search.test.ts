import { describe, it, expect } from 'vitest'
import { normalizeText, damerauLevenshtein, searchItems } from './search'

describe('Search Utility - Text Normalization', () => {
  it('should normalize uppercase to lowercase', () => {
    expect(normalizeText('COCA COLA')).toBe('coca cola')
  })

  it('should remove accents', () => {
    expect(normalizeText('plátano café jabón sí')).toBe('platano cafe jabon si')
  })

  it('should remove dieresis', () => {
    expect(normalizeText('pingüino')).toBe('pinguino')
  })

  it('should normalize eñe to n', () => {
    expect(normalizeText('piña')).toBe('pina')
  })
})

describe('Search Utility - Damerau-Levenshtein Distance', () => {
  it('should return 0 for identical strings', () => {
    expect(damerauLevenshtein('coca', 'coca')).toBe(0)
  })

  it('should return 1 for a single deletion', () => {
    expect(damerauLevenshtein('jabon', 'jabo')).toBe(1)
  })

  it('should return 1 for a single insertion', () => {
    expect(damerauLevenshtein('jabon', 'jabonn')).toBe(1)
  })

  it('should return 1 for a single substitution', () => {
    expect(damerauLevenshtein('jabon', 'jabin')).toBe(1)
  })

  it('should return 1 for a single transposition (swap)', () => {
    expect(damerauLevenshtein('cloa', 'cola')).toBe(1)
    expect(damerauLevenshtein('coca-cloa', 'coca-cola')).toBe(1)
  })

  it('should return 2 for two differences', () => {
    expect(damerauLevenshtein('jabon', 'jabinns')).toBe(3) // substitution + insertion + insertion
    expect(damerauLevenshtein('cola', 'clao')).toBe(2) // transposition + substitution or 2 substitutions
  })
})

describe('Search Utility - searchItems', () => {
  interface TestProduct {
    id: string
    name: string
    category: string
  }

  const products: TestProduct[] = [
    { id: '1', name: 'Coca Cola 600ml', category: 'Refrescos' },
    { id: '2', name: 'Piña Almíbar Hda', category: 'Conservas' },
    { id: '3', name: 'Jabón Palmolive', category: 'Higiene' },
    { id: '4', name: 'Plátano Tabasco', category: 'Frutas' },
    { id: '5', name: 'Crema Alpura 250ml', category: 'Lácteos' },
    { id: '6', name: 'Pingüino Marinela', category: 'Pan dulce' },
  ]

  it('should return all products when query is empty', () => {
    expect(searchItems(products, '', ['name', 'category'])).toEqual(products)
    expect(searchItems(products, '   ', ['name', 'category'])).toEqual(products)
  })

  it('should match case-insensitively', () => {
    const results = searchItems(products, 'coca', ['name'])
    expect(results).toHaveLength(1)
    expect(results[0]!.name).toBe('Coca Cola 600ml')
  })

  it('should match ignoring accents', () => {
    // Search "jabon" for "Jabón"
    const results1 = searchItems(products, 'jabon', ['name'])
    expect(results1).toHaveLength(1)
    expect(results1[0]!.name).toBe('Jabón Palmolive')

    // Search "platano" for "Plátano"
    const results2 = searchItems(products, 'platano', ['name'])
    expect(results2).toHaveLength(1)
    expect(results2[0]!.name).toBe('Plátano Tabasco')
  })

  it('should match ignoring dieresis', () => {
    // Search "pinguino" for "Pingüino"
    const results = searchItems(products, 'pinguino', ['name'])
    expect(results).toHaveLength(1)
    expect(results[0]!.name).toBe('Pingüino Marinela')
  })

  it('should match eñe with n and vice-versa', () => {
    // Search "pina" for "Piña"
    const results1 = searchItems(products, 'pina', ['name'])
    expect(results1).toHaveLength(1)
    expect(results1[0]!.name).toBe('Piña Almíbar Hda')

    // Search "piña" for "Piña"
    const results2 = searchItems(products, 'piña', ['name'])
    expect(results2).toHaveLength(1)
    expect(results2[0]!.name).toBe('Piña Almíbar Hda')
  })

  it('should match using multiple words (AND search)', () => {
    // "coca 600" should match "Coca Cola 600ml"
    const results = searchItems(products, 'coca 600', ['name'])
    expect(results).toHaveLength(1)
    expect(results[0]!.name).toBe('Coca Cola 600ml')
  })

  it('should fuzzy match with 1 typo (length 4-7)', () => {
    // "cloa" (len 4) -> should match "Coca Cola 600ml" (matches "cola")
    const results = searchItems(products, 'cloa', ['name'])
    expect(results).toHaveLength(1)
    expect(results[0]!.name).toBe('Coca Cola 600ml')
  })

  it('should fuzzy match with up to 2 typos (length >= 8)', () => {
    // "palmolivv" (len 9, 1 typo) -> should match "Jabón Palmolive"
    const results1 = searchItems(products, 'palmolivv', ['name'])
    expect(results1).toHaveLength(1)
    expect(results1[0]!.name).toBe('Jabón Palmolive')

    // "palmolvvv" (len 9, 2 typos: replacement + replacement) -> should match "Jabón Palmolive"
    const results2 = searchItems(products, 'palmolvvv', ['name'])
    expect(results2).toHaveLength(1)
    expect(results2[0]!.name).toBe('Jabón Palmolive')

    // "palmovvvv" (len 9, 3 typos) -> should NOT match "Jabón Palmolive"
    const results3 = searchItems(products, 'palmovvvv', ['name'])
    expect(results3).toHaveLength(0)
  })

  it('should sort results by relevance (score)', () => {
    const list = [
      { id: '1', name: 'Crema Alpura 250ml', category: 'Lácteos' },
      { id: '2', name: 'Crema Lala 250ml', category: 'Lácteos' },
      { id: '3', name: 'Cremoso Yoplait', category: 'Lácteos' },
    ]

    // Searching "crem"
    // "Crema Alpura 250ml" contains "crema" (starts with "crem").
    // "Cremoso Yoplait" contains "cremoso" (starts with "crem").
    // Shorter target words (exact match or shorter prefix) should rank higher.
    const results = searchItems(list, 'crem', ['name'])
    expect(results).toHaveLength(3)
    expect(results[0]!.name).toContain('Crema')
    expect(results[1]!.name).toContain('Crema')
    expect(results[2]!.name).toBe('Cremoso Yoplait')
  })

  it('should search products by barcode', () => {
    const productsWithBarcode = [
      { id: '1', name: 'Sabritas Sal 45g', category: 'Botanas', barcode: '7501000111223' },
      { id: '2', name: 'Galletas Chokis', category: 'Galletas', barcode: '7501055300078' },
    ]

    const results = searchItems(productsWithBarcode, '7501055', ['name', 'category', 'barcode'])
    expect(results).toHaveLength(1)
    expect(results[0]!.name).toBe('Galletas Chokis')
  })
})
