# CRM Field Reference

## Customer

| Field | Type | Description |
|-------|------|-------------|
| CustomerID | string | Account code (e.g. `ABCCORP`) |
| CustomerName | string | Company display name |
| Status | string | `Active`, `Inactive`, `One-Time` |
| Balance | decimal | Outstanding AR balance |
| CreditLimit | decimal | Approved credit limit |
| PaymentTermsID | string | Default terms (e.g. `NET30`) |
| CurrencyID | string | Account currency |
| ClassID | string | Customer class |
| PrimaryContact | object | Main contact |
| BillingAddress | object | Billing address |
| Phone1 | string | Primary phone |
| Email | string | Account email |

## Lead

| Field | Type | Description |
|-------|------|-------------|
| LeadID | string | Auto-generated lead ID |
| FirstName | string | First name (**required**) |
| LastName | string | Last name (**required**) |
| Email | string | Email address (**required**) |
| CompanyName | string | Company/organization |
| Phone1 | string | Phone number |
| Source | string | `Web`, `Referral`, `Campaign`, `Trade Show`, etc. |
| Status | string | `New`, `Open`, `Qualified`, `Converted` |
| CreatedDateTime | datetime | Creation timestamp |
| OwnerID | string | Assigned sales rep |

## Opportunity

| Field | Type | Description |
|-------|------|-------------|
| OpportunityID | string | Opportunity ID |
| Subject | string | Brief description |
| Status | string | `New`, `Open`, `Won`, `Lost` |
| Stage | string | Sales stage (e.g. `Prospect`, `Proposal`, `Negotiation`) |
| Amount | decimal | Estimated deal value |
| CloseDate | date | Expected close date (YYYY-MM-DD) |
| CustomerID | string | Linked customer account |
| ContactID | string | Linked contact |
| OwnerID | string | Assigned sales rep |
| Probability | integer | Win probability % |
| CreatedDateTime | datetime | Creation timestamp |

## Contact

| Field | Type | Description |
|-------|------|-------------|
| ContactID | string | Contact ID |
| FirstName | string | First name |
| LastName | string | Last name |
| Email | string | Email address |
| Phone1 | string | Phone number |
| JobTitle | string | Job title |
| AccountID | string | Linked customer account |
| Status | string | `Active`, `Inactive` |

## OData Filter Examples

```
# Open opportunities over $50,000 closing this quarter
Status eq 'Open' and Amount gt 50000 and CloseDate le '2026-06-30'

# New leads created this month
Status eq 'New' and CreatedDateTime ge '2026-04-01'

# All leads from a specific source
Source eq 'Web' and Status ne 'Converted'

# Customers with outstanding balance over $100,000
Balance gt 100000 and Status eq 'Active'

# Find customer by partial name
contains(CustomerName,'Acme')

# Opportunities assigned to a rep
OwnerID eq 'JSMITH' and Status eq 'Open'

# High-probability opportunities
Status eq 'Open' and Probability ge 75
```

## Common $select Fields

```
# Opportunity pipeline
OpportunityID,Subject,Amount,CloseDate,Stage,OwnerID,Probability

# Lead list
LeadID,FirstName,LastName,Email,CompanyName,Source,Status,CreatedDateTime

# Customer summary
CustomerID,CustomerName,Balance,CreditLimit,Status,PaymentTermsID

# Contact list
ContactID,FirstName,LastName,Email,JobTitle,AccountID
```

## Lead Source Values

`Web`, `Referral`, `Campaign`, `Trade Show`, `Cold Call`, `Partner`, `Other`

## Opportunity Stage Values

`Prospect`, `Proposal`, `Negotiation`, `Closed Won`, `Closed Lost`
