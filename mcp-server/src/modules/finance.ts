/** Maps user-facing record type names to Acumatica API entity names */
export const FINANCE_TYPES: Record<string, string> = {
  Invoice: 'Invoice',
  Bill: 'Bill',
  Payment: 'Payment',
  JournalEntry: 'JournalTransaction',
  CashAccount: 'CashAccount',
};

/** Maps common action names per Finance type */
export const FINANCE_ACTIONS: Record<string, string[]> = {
  Invoice: ['Release', 'Void', 'ApplyPayment'],
  Bill: ['Release', 'Void'],
  Payment: ['Release', 'Void'],
  JournalEntry: ['Release'],
  CashAccount: [],
};

export function isFinanceType(type: string): boolean {
  return type in FINANCE_TYPES;
}

export function resolveFinanceEntity(type: string): string {
  return FINANCE_TYPES[type] ?? type;
}
