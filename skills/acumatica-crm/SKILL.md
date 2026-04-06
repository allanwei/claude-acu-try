---
name: acumatica-crm
description: >
  This skill should be used when the user asks about customers, leads, opportunities,
  or contacts. Handles requests like "show open opportunities", "create a new lead",
  "convert a lead", "top customers by revenue", "find customer", or any Acumatica CRM
  read, write, update, or action operation.
metadata:
  version: "1.0.0"
---

# Acumatica CRM

Assist business users with Acumatica CRM operations.

## Record Type Mapping

| User says | `type` parameter |
|-----------|-----------------|
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

Before calling `acumatica_create`, `acumatica_update`, or `acumatica_action`, state what will happen and ask for confirmation:
> "I'm about to [action description]. Should I proceed?"

Wait for explicit confirmation before proceeding.

## Creating a Lead

Required fields: `FirstName`, `LastName`, `Email`. Optional: `CompanyName`, `Phone`, `Source`.

## Common Actions

| Intent | Call |
|--------|------|
| Convert lead to opportunity | `acumatica_action(type="Lead", id="{id}", action="ConvertToOpportunity")` |
| Convert lead to contact | `acumatica_action(type="Lead", id="{id}", action="ConvertToContact")` |
| Mark opportunity won | `acumatica_action(type="Opportunity", id="{id}", action="Win")` |
| Mark opportunity lost | `acumatica_action(type="Opportunity", id="{id}", action="Lose")` |

See `references/field-reference.md` for all available fields and OData filter syntax.
