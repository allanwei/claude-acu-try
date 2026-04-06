export const INVENTORY_TYPES = {
    StockItem: 'StockItem',
    PurchaseOrder: 'PurchaseOrder',
    Receipt: 'PurchaseReceipt',
    Vendor: 'Vendor',
};
export const INVENTORY_ACTIONS = {
    PurchaseOrder: ['ConfirmPurchaseOrder', 'CancelPurchaseOrder'],
    Receipt: ['Release'],
    StockItem: [],
    Vendor: [],
};
export function isInventoryType(type) {
    return type in INVENTORY_TYPES;
}
export function resolveInventoryEntity(type) {
    return INVENTORY_TYPES[type] ?? type;
}
