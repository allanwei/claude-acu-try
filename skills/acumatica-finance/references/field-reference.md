# Finance Field Reference

## Invoice (AR Invoice)

| Field | Type | Description |
|-------|------|-------------|
| ReferenceNbr | string | Document number (e.g. `INV000123`) |
| CustomerID | string | Customer account ID |
| CustomerName | string | Customer display name |
| Date | date | Invoice date (YYYY-MM-DD) |
| DueDate | date | Payment due date |
| Amount | decimal | Total invoice amount |
| Status | string | `Open`, `Closed`, `Voided`, `On Hold` |
| Description | string | Invoice memo |
| Details | array | Line items (see below) |

### Invoice Line Item Fields

| Field | Type | Description |
|-------|------|-------------|
| InventoryID | string | Item code |
| Description | string | Line description |
| Quantity | decimal | Quantity |
| UnitPrice | decimal | Price per unit |
| Amount | decimal | Extended amount |

## Bill (AP Bill)

| Field | Type | Description |
|-------|------|-------------|
| ReferenceNbr | string | Bill number |
| VendorID | string | Vendor account ID |
| VendorName | string | Vendor display name |
| Date | date | Bill date |
| DueDate | date | Payment due date |
| Amount | decimal | Total amount |
| Status | string | `Open`, `Closed`, `On Hold` |

## Payment (Customer Payment)

| Field | Type | Description |
|-------|------|-------------|
| ReferenceNbr | string | Payment reference |
| CustomerID | string | Customer account ID |
| PaymentDate | date | Date received |
| Amount | decimal | Payment amount |
| Status | string | `Balanced`, `Open`, `Closed` |
| PaymentMethod | string | e.g. `CHECK`, `WIRE`, `CC` |
| ApplicationDate | date | Date applied to invoice |

## JournalEntry (GL Entry)

| Field | Type | Description |
|-------|------|-------------|
| BatchNbr | string | Journal batch number |
| Date | date | Posting date |
| LedgerID | string | Target ledger |
| Description | string | Memo |
| Status | string | `Balanced`, `Posted`, `Unposted` |
| Details | array | Debit/credit lines |

### Journal Line Fields

| Field | Type | Description |
|-------|------|-------------|
| AccountID | string | GL account number |
| SubaccountID | string | Subaccount |
| Debit | decimal | Debit amount |
| Credit | decimal | Credit amount |
| Description | string | Line memo |

## CashAccount

| Field | Type | Description |
|-------|------|-------------|
| CashAccountID | string | Account code |
| Description | string | Account name |
| CurrencyID | string | ISO currency code |
| Balance | decimal | Current balance |
| BankAccountNbr | string | Bank account number |

## OData Filter Examples

```
# Open invoices over $10,000 due this quarter
Status eq 'Open' and Amount gt 10000 and DueDate le '2026-06-30'

# Invoices for a specific customer
CustomerID eq 'ABCCORP' and Status eq 'Open'

# Bills overdue as of today
Status eq 'Open' and DueDate lt '2026-04-06'

# Journal entries posted in Q1
Status eq 'Posted' and Date ge '2026-01-01' and Date le '2026-03-31'
```

## Common $select Fields

Minimize response size by selecting only needed fields:

```
# Invoice summary
ReferenceNbr,CustomerID,Amount,DueDate,Status

# Bill summary
ReferenceNbr,VendorID,Amount,DueDate,Status

# Payment summary
ReferenceNbr,CustomerID,Amount,PaymentDate,Status
```
