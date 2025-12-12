import { Sale } from '../types';

const PENDING_ORDERS_KEY = 'pending_sales_orders';

export const localStorageService = {
  getPendingOrders: (): Sale[] => {
    try {
      const stored = localStorage.getItem(PENDING_ORDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse pending orders', error);
      return [];
    }
  },
  savePendingOrder: (sale: Sale) => {
    const orders = localStorageService.getPendingOrders();
    orders.push(sale);
    localStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(orders));
  },
  clearPendingOrders: () => {
    localStorage.removeItem(PENDING_ORDERS_KEY);
  }
};
