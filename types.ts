export enum TipoUnidad {
  Pinta = 'Pinta',
  Litro = 'Litro',
  Mixed = 'Mixto',
}

export enum TipoPago {
  Digital = '$ Digital',
  Billete = '$ Billete',
}

export interface FeriaConfig {
  nombreFeria: string;
  fechaInicio: string;
  fechaFin: string;
  valorPinta: number;
  valorLitro: number;
  stock: Record<string, number>; // Litros iniciales por estilo
  desperdicio: number; // Porcentaje de desperdicio (0-100)
}

export interface Sale {
  id?: string;
  fechaVenta: string;
  tipoUnidad: TipoUnidad;
  cantidadUnidades: number;
  montoTotal: number;
  tipoPago: TipoPago;
  usuarioVenta: string;
  estilo?: string; // Estilo de cerveza vendido
}

export interface StyleStockSummary {
  style: string;
  initial: number;
  sold: number; // Litros vendidos
  wastage: number; // Litros desperdicio
  remaining: number;
  percentage: number;
}

export interface ReportSummary {
  totalPintas: number;
  totalLitros: number;
  montoTotalGeneral: number;
  montoTotalDigital: number;
  montoTotalBillete: number;
  stockSummary: StyleStockSummary[];
}

export interface HistoricalFeria {
  id: string;
  config: FeriaConfig;
  sales: Sale[];
  reportSummary: ReportSummary;
  archivedAt: string;
}

export const ADMIN_ROLE = 'admin';
export const SALES_ROLE = 'sales';

export interface LoginResult {
  success: boolean;
  role: string | null;
  username: string;
}