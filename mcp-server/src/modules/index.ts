import { FINANCE_TYPES, FINANCE_ACTIONS, isFinanceType, resolveFinanceEntity } from './finance.js';
import { INVENTORY_TYPES, INVENTORY_ACTIONS, isInventoryType, resolveInventoryEntity } from './inventory.js';
import { CRM_TYPES, CRM_ACTIONS, isCrmType, resolveCrmEntity } from './crm.js';

export const ALL_TYPES = { ...FINANCE_TYPES, ...INVENTORY_TYPES, ...CRM_TYPES };
export const ALL_ACTIONS = { ...FINANCE_ACTIONS, ...INVENTORY_ACTIONS, ...CRM_ACTIONS };

export function resolveEntity(type: string): string {
  if (isFinanceType(type)) return resolveFinanceEntity(type);
  if (isInventoryType(type)) return resolveInventoryEntity(type);
  if (isCrmType(type)) return resolveCrmEntity(type);
  throw new Error(
    `Unknown record type "${type}". Supported types: ${Object.keys(ALL_TYPES).join(', ')}`
  );
}

export function supportedActionsFor(type: string): string[] {
  return ALL_ACTIONS[type] ?? [];
}

export { isFinanceType, isInventoryType, isCrmType };
