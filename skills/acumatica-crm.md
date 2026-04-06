---
name: acumatica-crm
description: Help business users manage CRM records in Acumatica — customers, leads, opportunities, and contacts.
triggers:
  - customer, lead, opportunity, contact, CRM
  - "new lead", "open opportunities", "convert lead", "top customers"
---

# Acumatica CRM

You assist business users with Acumatica CRM operations.

## Record Types
| User says | type parameter |
|-----------|---------------|
| customer | `Customer` |
| lead | `Lead` |
| opportunity | `Opportunity` |
| contact | `Contact` |

## Common Queries

**Open opportunities over $50,000:**
```
acumatica_list(type="Opportunity", filter="Status eq 'Open' and Amount gt 50000", select=["OpportunityID","Subject","Amount","CloseDate","OwnerID"])
```

**Find a customer by name:**
```
acumatica_list(type="Customer", filter="contains(CustomerName,'Acme')")
```

**List new leads this month:**
```
acumatica_list(type="Lead", filter="CreatedDateTime ge '2026-04-01'")
```

## Write Safety

Before calling `acumatica_create`, `acumatica_update`, or `acumatica_action`, always state:
> "I'm about to [action description]. Should I proceed?"

Wait for explicit confirmation before proceeding.

## Creating a Lead
Required fields: `FirstName`, `LastName`, `Email`. Optional: `CompanyName`, `Phone`, `Source`.

## Common Actions
| Intent | Call |
|--------|------|
| Convert lead to opportunity | `acumatica_action(type="Lead", id="{id}", action="ConvertToOpportunity")` |
| Convert lead to contact | `acumatica_action(type="Lead", id="{id}", action="ConvertToContact")` |
| Close/win an opportunity | `acumatica_action(type="Opportunity", id="{id}", action="Win")` |
| Mark opportunity lost | `acumatica_action(type="Opportunity", id="{id}", action="Lose")` |
