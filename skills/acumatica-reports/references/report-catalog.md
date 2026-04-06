# Acumatica Report Catalog

## Accounts Receivable Reports

### AR631000 — Aged Receivables

Shows outstanding customer balances grouped by aging bucket.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| AsOfDate | date | Aging date (default: today) |
| CustomerID | string | Filter to single customer |
| ShowDetails | bool | Include individual invoices |
| AgingBy | string | `DueDate` or `DocDate` |

**Columns:** CustomerID, CustomerName, Current, 1–30 Days, 31–60 Days, 61–90 Days, 90+ Days, Total

---

### AR641000 — Customer Statement

Detailed statement of transactions for a customer within a date range.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| CustomerID | string | **Required.** Target customer |
| FromDate | date | Start date |
| ToDate | date | End date (default: today) |
| StatementType | string | `OpenItem` or `BalanceForward` |

---

## Accounts Payable Reports

### AP631000 — Aged Payables

Shows outstanding vendor balances grouped by aging bucket.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| AsOfDate | date | Aging date (default: today) |
| VendorID | string | Filter to single vendor |
| ShowDetails | bool | Include individual bills |

**Columns:** VendorID, VendorName, Current, 1–30 Days, 31–60 Days, 61–90 Days, 90+ Days, Total

---

## General Ledger Reports

### GL632000 — Trial Balance

Summary of all GL account balances as of a date.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| LedgerID | string | Target ledger (default: ACTUAL) |
| AsOfDate | date | Balance date |
| IncludeZeroBalances | bool | Show accounts with $0 balance |
| FromAccount | string | Starting account number |
| ToAccount | string | Ending account number |

**Columns:** AccountID, AccountDescription, Debit, Credit, Balance

---

## Ad-hoc Analysis Queries

Use `acumatica_query_summary` for open-ended questions that don't map to a named report.

### Common Patterns

**Total AR balance by customer (top 10):**
```
type="Customer"
select=["CustomerID","CustomerName","Balance"]
filter="Balance gt 0"
top=10
```
Sort by Balance descending, present as table.

**Overdue invoices:**
```
type="Invoice"
filter="Status eq 'Open' and DueDate lt '{today}'"
select=["ReferenceNbr","CustomerID","Amount","DueDate"]
```

**Invoice aging summary (manual):**
Query open invoices, group by days overdue (DueDate vs today), aggregate amounts per bucket.

**Top vendors by spend (YTD):**
```
type="Bill"
filter="Date ge '{year-start}'"
select=["VendorID","Amount"]
```
Aggregate by VendorID.

**Open opportunity pipeline by stage:**
```
type="Opportunity"
filter="Status eq 'Open'"
select=["Stage","Amount","CloseDate","OwnerID"]
```
Group by Stage, sum Amount.

---

## Presentation Guidelines

- Format all currency as `$#,##0.00`
- Include a **Summary** after every table: totals, averages, notable outliers
- If data is truncated at `top=N`, say "Showing top N results — ask me to fetch more if needed"
- For aging reports, highlight buckets > 60 days as overdue
- For pipeline reports, group by stage or owner when there are more than 5 rows
