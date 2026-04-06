export const INVENTORY_TYPES: Record<string, string> = {
  StockItem: 'StockItem',
  PurchaseOrder: 'PurchaseOrder',
  Receipt: 'PurchaseReceipt',
  Vendor: 'Vendor',
};

export const INVENTORY_ACTIONS: Record<string, string[]> = {
  PurchaseOrder: ['ConfirmPurchaseOrder', 'CancelPurchaseOrder'],
  Receipt: ['Release'],
  StockItem: [],
  Vendor: [],
};

export function isInventoryType(type: string): boolean {
  return type in INVENTORY_TYPES;
}

export function resolveInventoryEntity(type: string): string {
  return INVENTORY_TYPES[type] ?? type;
}
