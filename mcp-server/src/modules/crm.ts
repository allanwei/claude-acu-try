export const CRM_TYPES: Record<string, string> = {
  Customer: 'Customer',
  Lead: 'Lead',
  Opportunity: 'CRMOpportunity',
  Contact: 'Contact',
};

export const CRM_ACTIONS: Record<string, string[]> = {
  Lead: ['ConvertToOpportunity', 'ConvertToContact'],
  Opportunity: ['Close', 'Win', 'Lose'],
  Customer: [],
  Contact: [],
};

export function isCrmType(type: string): boolean {
  return type in CRM_TYPES;
}

export function resolveCrmEntity(type: string): string {
  return CRM_TYPES[type] ?? type;
}
