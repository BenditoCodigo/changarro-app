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

  export interface WriteExcelOptions {
    sheets: string[]
  }

  export default function writeExcelFile(
    sheets: CellData[][][],
    options: WriteExcelOptions,
  ): Promise<Blob>
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

  export interface WriteExcelOptions {
    sheets: string[]
  }

  export default function writeExcelFile(
    sheets: CellData[][][],
    options: WriteExcelOptions,
  ): Promise<Blob>
}
