---
name: acumatica-reports
description: >
  This skill should be used when the user asks for a report, analysis, or summary of
  Acumatica data. Handles requests like "run aged receivables", "show trial balance",
  "top 5 customers by balance", "overdue invoices this quarter", "what is our total AR",
  or any natural-language reporting or data analysis question against Acumatica.
metadata:
  version: "1.0.0"
---

# Acumatica Reports

Help business users run reports and analyze ERP data. Present results as markdown tables. Add a **Summary** line after each table with totals, averages, and notable outliers.

## Built-in Reports

Use `acumatica_report` for named Acumatica reports:

| User asks for | `reportId` |
|---------------|-----------|
| Aged receivables / who owes us money | `AR631000` |
| Aged payables / what we owe vendors | `AP631000` |
| Trial balance | `GL632000` |
| Customer statement | `AR641000` |

Example:
```
acumatica_report(reportId="AR631000")
```

## Ad-hoc Analysis

For open-ended questions, use `acumatica_query_summary` to fetch data and summarize in natural language.

**Top customers by balance:**
```
acumatica_query_summary(type="Customer", top=10, select=["CustomerID","CustomerName","Balance"], filter="Balance gt 0")
```
Sort the results and present the top 5 by balance.

**Overdue invoices:**
```
acumatica_query_summary(type="Invoice", filter="Status eq 'Open' and DueDate lt '2026-04-06'", select=["ReferenceNbr","CustomerID","Amount","DueDate"])
```

**Open opportunities this quarter:**
```
acumatica_query_summary(type="Opportunity", filter="Status eq 'Open' and CloseDate ge '2026-01-01'", select=["OpportunityID","Subject","Amount","OwnerID"])
```

## Presentation Rules

- Format all currency as `$#,##0.00`.
- Always include a **Summary** after tables (totals, averages, outliers).
- If results are truncated, say "Showing top N results — ask me to fetch more if needed."

See `references/report-catalog.md` for the full list of available reports and their parameters.
