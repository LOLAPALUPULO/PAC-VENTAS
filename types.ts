export type TipoPago = 'EFECTIVO' | 'DIGITAL';
export type TipoUnidad = 'PINTA' | 'LITRO';

export interface Sale {
  id: string;
  timestamp: number;
  items: {
    pinta: number;
    litro: number;
  };
  total: number;
  paymentMethod: TipoPago;
}

export interface FeriaConfig {
  id: string;
  name: string;
  pintaPrice: number;
  litroPrice: number;
  isActive: boolean;
}
