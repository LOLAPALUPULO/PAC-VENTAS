export enum TipoUnidad {
  Pinta = 'Pinta',
  Litro = 'Litro',
  Mixed = 'Mixto',
}

export enum TipoPago {
  Digital = '$ Digital',
  Billete = '$ Billete',
}

export interface SaleItem {
  style: string;
  unit: TipoUnidad;
  quantity: number;
}

export interface Sale {
  id?: string; // Optional for new sales, required for fetched ones
  fechaVenta: string;
  items: SaleItem[];
  tipoUnidad: TipoUnidad; // Redundant but kept for backward compatibility with old report logic
  cantidadUnidades: number; // Redundant but kept for backward compatibility with old report logic
  montoTotal: number;
  tipoPago: TipoPago;
  usuarioVenta: string;
}

export interface StockConfig {
  [style: string]: number; // e.g., { 'IPA': 20, 'GOLDEN': 15 }
}

export interface FeriaConfig {
  nombreFeria: string;
  fechaInicio: string;
  fechaFin: string;
  valorPinta: number;
  valorLitro: number;
  wastePerPint: number; // in ML
  stock: StockConfig; // Initial stock in Liters per style
}

export interface ReportSummary {
  totalPintas: number;
  totalLitros: number;
  montoTotalGeneral: number;
  montoTotalDigital: number;
  montoTotalBillete: number;
  consumptionByStyle: StockConfig; // Consumed amount in Liters per style
}

export interface FeriaHistory {
  id?: string;
  config: FeriaConfig;
  sales: Sale[];
  reportSummary: ReportSummary;
  archivedAt: string;
}
