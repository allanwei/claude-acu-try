/** Maps user-facing record type names to Acumatica API entity names */
export const FINANCE_TYPES = {
    Invoice: 'Invoice',
    Bill: 'Bill',
    Payment: 'Payment',
    JournalEntry: 'JournalTransaction',
    CashAccount: 'CashAccount',
};
/** Maps common action names per Finance type */
export const FINANCE_ACTIONS = {
    Invoice: ['Release', 'Void', 'ApplyPayment'],
    Bill: ['Release', 'Void'],
    Payment: ['Release', 'Void'],
    JournalEntry: ['Release'],
    CashAccount: [],
};
export function isFinanceType(type) {
    return type in FINANCE_TYPES;
}
export function resolveFinanceEntity(type) {
    return FINANCE_TYPES[type] ?? type;
}
