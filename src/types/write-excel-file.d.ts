declare module 'write-excel-file/browser' {
  export interface CellData {
    value: unknown
    format?: string
    fontWeight?: string
    fontStyle?: string
    fontSize?: number
    color?: string
    backgroundColor?: string
  }

  export interface SheetObject {
    sheet?: string
    data: CellData[][]
  }

  export interface WriteExcelOutput {
    toBlob: () => Promise<Blob>
    toFile: (fileName: string) => Promise<void>
  }

  export default function writeExcelFile(
    sheets: SheetObject[] | CellData[][],
    options?: { sheet?: string },
  ): WriteExcelOutput
}

declare module 'write-excel-file/universal' {
  export interface CellData {
    value: unknown
    format?: string
    fontWeight?: string
    fontStyle?: string
    fontSize?: number
    color?: string
    backgroundColor?: string
  }

  export interface SheetObject {
    sheet?: string
    data: CellData[][]
  }

  export interface WriteExcelOutput {
    toBlob: () => Promise<Blob>
    toFile: (fileName: string) => Promise<void>
  }

  export default function writeExcelFile(
    sheets: SheetObject[] | CellData[][],
    options?: { sheet?: string },
  ): WriteExcelOutput
}
