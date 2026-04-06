export const CRM_TYPES = {
    Customer: 'Customer',
    Lead: 'Lead',
    Opportunity: 'CRMOpportunity',
    Contact: 'Contact',
};
export const CRM_ACTIONS = {
    Lead: ['ConvertToOpportunity', 'ConvertToContact'],
    Opportunity: ['Close', 'Win', 'Lose'],
    Customer: [],
    Contact: [],
};
export function isCrmType(type) {
    return type in CRM_TYPES;
}
export function resolveCrmEntity(type) {
    return CRM_TYPES[type] ?? type;
}
