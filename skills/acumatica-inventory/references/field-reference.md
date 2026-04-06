# Inventory & Purchasing Field Reference

## StockItem

| Field | Type | Description |
|-------|------|-------------|
| InventoryID | string | Item code (e.g. `WIDGET-A`) |
| Description | string | Item name |
| ItemClass | string | Category/class |
| DefaultPrice | decimal | Default unit price |
| DefaultCost | decimal | Default unit cost |
| QtyOnHand | decimal | Current quantity on hand |
| QtyAvailable | decimal | Available for sale/use |
| ReorderPoint | decimal | Minimum threshold before reorder |
| ReorderQty | decimal | Suggested reorder quantity |
| PreferredVendorID | string | Default vendor |
| UOM | string | Unit of measure (e.g. `EA`, `BOX`) |
| Status | string | `Active`, `Inactive` |

## PurchaseOrder

| Field | Type | Description |
|-------|------|-------------|
| OrderNbr | string | PO number (e.g. `PO000042`) |
| VendorID | string | Vendor account ID |
| VendorName | string | Vendor display name |
| Date | date | Order date (YYYY-MM-DD) |
| PromisedOn | date | Expected delivery date |
| Status | string | `Open`, `Closed`, `Cancelled`, `On Hold` |
| OrderTotal | decimal | Total PO amount |
| Details | array | Line items (see below) |

### PO Line Item Fields

| Field | Type | Description |
|-------|------|-------------|
| LineNbr | integer | Line number |
| InventoryID | string | Item code |
| Description | string | Line description |
| OrderQty | decimal | Ordered quantity |
| UnitCost | decimal | Cost per unit |
| ExtCost | decimal | Extended cost |
| ReceivedQty | decimal | Quantity received to date |
| UOM | string | Unit of measure |

## Receipt (Purchase Receipt)

| Field | Type | Description |
|-------|------|-------------|
| ReceiptNbr | string | Receipt number |
| VendorID | string | Vendor account ID |
| Date | date | Receipt date |
| Status | string | `Balanced`, `Released`, `On Hold` |
| ControlTotal | decimal | Total receipt value |
| Details | array | Received line items |

## Vendor

| Field | Type | Description |
|-------|------|-------------|
| VendorID | string | Vendor account code |
| VendorName | string | Vendor display name |
| Status | string | `Active`, `Inactive` |
| PaymentTermsID | string | Default payment terms |
| CurrencyID | string | Vendor currency |
| PrimaryContact | object | Main contact info |

## OData Filter Examples

```
# Items below reorder point
QtyOnHand lt ReorderPoint

# Items below reorder point for a specific class
QtyOnHand lt ReorderPoint and ItemClass eq 'HARDWARE'

# Open POs for a vendor
VendorID eq 'ACME' and Status eq 'Open'

# POs expected this week
Status eq 'Open' and PromisedOn ge '2026-04-06' and PromisedOn le '2026-04-12'

# High-value open POs
Status eq 'Open' and OrderTotal gt 50000

# Active items with no stock
Status eq 'Active' and QtyOnHand eq 0
```

## Common $select Fields

```
# Stock level summary
InventoryID,Description,QtyOnHand,ReorderPoint,PreferredVendorID

# PO summary
OrderNbr,VendorID,Date,PromisedOn,OrderTotal,Status

# Vendor list
VendorID,VendorName,Status,PaymentTermsID
```
