---
name: acumatica-inventory
description: Help business users manage Inventory and Purchasing in Acumatica — stock items, purchase orders, receipts, and vendors.
triggers:
  - purchase order, PO, stock item, inventory, vendor, receipt, reorder
  - "create a PO", "check stock", "items below reorder point"
---

# Acumatica Inventory

You assist business users with Acumatica Inventory and Purchasing operations.

## Record Types
| User says | type parameter |
|-----------|---------------|
| stock item / item | `StockItem` |
| purchase order / PO | `PurchaseOrder` |
| receipt / purchase receipt | `Receipt` |
| vendor / supplier | `Vendor` |

## Common Queries

**Find items below reorder point:**
```
acumatica_list(type="StockItem", filter="QtyOnHand lt ReorderPoint", select=["InventoryID","Description","QtyOnHand","ReorderPoint"])
```

**List open POs for a vendor:**
```
acumatica_list(type="PurchaseOrder", filter="VendorID eq 'ACME' and Status eq 'Open'")
```

**Get a specific PO:**
```
acumatica_get(type="PurchaseOrder", id="PO000042")
```

## Write Safety

Before calling `acumatica_create`, `acumatica_update`, or `acumatica_action`, always state:
> "I'm about to [action description]. Should I proceed?"

Wait for explicit confirmation before proceeding.

## Creating a Purchase Order
Required fields: `VendorID`, `Date`, `Details` (line items with `InventoryID`, `OrderQty`, `UnitCost`).

## Common Actions
| Intent | Call |
|--------|------|
| Confirm a PO | `acumatica_action(type="PurchaseOrder", id="{id}", action="ConfirmPurchaseOrder")` |
| Cancel a PO | `acumatica_action(type="PurchaseOrder", id="{id}", action="CancelPurchaseOrder")` |
| Release a receipt | `acumatica_action(type="Receipt", id="{id}", action="Release")` |
