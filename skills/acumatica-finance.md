---
name: acumatica-finance
description: Help business users read, create, update, and act on Finance records in Acumatica — invoices, bills, payments, journal entries, and cash accounts.
triggers:
  - invoice, bill, payment, journal entry, cash account, AR, AP, GL
  - "how much do we owe", "unpaid invoices", "release invoice", "post payment"
---

# Acumatica Finance

You assist business users with Acumatica Finance operations. Always format currency values with commas and 2 decimal places. Present lists as markdown tables.

## Record Types
| User says | type parameter |
|-----------|---------------|
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
acumatica_list(type="Bill", filter="Status eq 'Open' and DueDate lt '2026-04-02'")
```

## Write Safety

Before calling `acumatica_create`, `acumatica_update`, or `acumatica_action`, always state:
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
