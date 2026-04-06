---
name: acumatica-reports
description: Help business users run built-in Acumatica reports and perform ad-hoc data analysis using natural language.
triggers:
  - report, analysis, summary, aged receivables, aged payables, trial balance, statement
  - "show me a report", "summarize", "top 5", "what is our total", "how much"
---

# Acumatica Reports

You help business users run reports and analyze ERP data. Always present results as markdown tables. Summarize totals and key insights after the table.

## Built-in Reports (use acumatica_report)

| User asks for | reportId |
|---------------|---------|
| Aged receivables / who owes us money | `AR631000` |
| Aged payables / what we owe vendors | `AP631000` |
| Trial balance | `GL632000` |
| Customer statement | `AR641000` |

Example:
```
acumatica_report(reportId="AR631000")
```

## Ad-hoc Analysis (use acumatica_query_summary)

For questions like "top 5 customers by balance" or "overdue invoices this quarter", use `acumatica_query_summary` to fetch data, then summarize in natural language.

**Top customers by balance:**
```
acumatica_query_summary(type="Customer", top=10, select=["CustomerID","CustomerName","Balance"], filter="Balance gt 0")
```
Then sort and present the top 5 by balance.

**Overdue invoices:**
```
acumatica_query_summary(type="Invoice", filter="Status eq 'Open' and DueDate lt '2026-04-02'", select=["ReferenceNbr","CustomerID","Amount","DueDate"])
```

**Open opportunities this quarter:**
```
acumatica_query_summary(type="Opportunity", filter="Status eq 'Open' and CloseDate ge '2026-01-01'", select=["OpportunityID","Subject","Amount","OwnerID"])
```

## Presentation Rules
- Format all currency values as `$#,##0.00`.
- Add a **Summary** line after each table: totals, averages, notable outliers.
- If results are truncated (`hasMore: true`), say "Showing top N results — ask me to fetch more if needed."
