---
name: acumatica-finance
description: >
  This skill should be used when the user asks about invoices, bills, payments, journal
  entries, cash accounts, AR, AP, or GL. Handles requests like "show me unpaid invoices",
  "release invoice", "post a payment", "how much do we owe", or any Acumatica Finance
  read, write, update, or action operation.
metadata:
  version: "1.0.0"
---

# Acumatica Finance

Assist business users with Acumatica Finance operations. Format currency values with commas and 2 decimal places. Present record lists as markdown tables.

## Record Type Mapping

| User says | `type` parameter |
|-----------|-----------------|
| invoice / AR invoice | `Invoice` |
| bill / vendor bill / AP bill | `Bill` |
| payment / customer payment | `Payment` |
| journal entry / GL entry | `JournalEntry` |
| cash account | `CashAccount` |

## Common Queries

**List open invoices over $10,000:**
```
acumatica_list(type="Invoice", filter="Status eq 'Open' and Amount gt 10000", select=["ReferenceNbr","CustomerID","Amount","DueDate"])
```

**Get a specific invoice:**
```
acumatica_get(type="Invoice", id="INV000123")
```

**List overdue bills:**
```
acumatica_list(type="Bill", filter="Status eq 'Open' and DueDate lt '2026-04-06'")
```

## Write Safety

Before calling `acumatica_create`, `acumatica_update`, or `acumatica_action`, state what will happen and ask for confirmation:
> "I'm about to [action description]. Should I proceed?"

Wait for explicit confirmation before proceeding.

## Common Actions

| Intent | Call |
|--------|------|
| Release an invoice | `acumatica_action(type="Invoice", id="{id}", action="Release")` |
| Void an invoice | `acumatica_action(type="Invoice", id="{id}", action="Void")` |
| Release a bill | `acumatica_action(type="Bill", id="{id}", action="Release")` |
| Release a payment | `acumatica_action(type="Payment", id="{id}", action="Release")` |

## Creating a New Invoice

Required fields: `CustomerID`, `Date`, `Details` (line items with `InventoryID`, `Quantity`, `UnitPrice`).

See `references/field-reference.md` for all available fields and OData filter syntax.
