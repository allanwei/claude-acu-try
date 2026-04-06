---
name: acumatica-inventory
description: >
  This skill should be used when the user asks about purchase orders, POs, stock items,
  inventory, vendors, receipts, or reorder points. Handles requests like "create a PO",
  "check stock levels", "items below reorder point", "confirm a purchase order", or any
  Acumatica Inventory and Purchasing read, write, update, or action operation.
metadata:
  version: "1.0.0"
---

# Acumatica Inventory

Assist business users with Acumatica Inventory and Purchasing operations.

## Record Type Mapping

| User says | `type` parameter |
|-----------|-----------------|
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

Before calling `acumatica_create`, `acumatica_update`, or `acumatica_action`, state what will happen and ask for confirmation:
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

See `references/field-reference.md` for all available fields and OData filter syntax.
