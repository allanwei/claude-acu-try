# Acumatica Claude Plugin — Design Spec

**Date:** 2026-04-02
**Status:** Approved

---

## Overview

A Claude Code plugin for business users to interact with an Acumatica ERP system using natural language. Supports read, write, update, and reporting across Finance (GL, AP, AR, Cash Management), Inventory/Purchasing, and CRM (Customers, Leads, Opportunities) modules.

---

## Architecture

```
claude-acumatica-plugin/
├── mcp-server/              # Node.js MCP server process
│   ├── src/
│   │   ├── index.ts         # MCP server entry point, tool registry
│   │   ├── auth/
│   │   │   ├── basic.ts     # Username/password session auth
│   │   │   └── oauth.ts     # OAuth 2.0 flow
│   │   ├── client.ts        # Acumatica REST API HTTP client
│   │   ├── modules/
│   │   │   ├── finance.ts   # GL, AP, AR, Cash Management tools
│   │   │   ├── inventory.ts # Inventory & Purchasing tools
│   │   │   └── crm.ts       # Customers, Leads, Opportunities tools
│   │   ├── reports.ts       # Built-in report runner + NL summarization
│   │   └── config.ts        # Load/save connection config from ~/.acumatica-plugin.json
│   └── package.json
├── skills/
│   ├── acumatica-setup.md
│   ├── acumatica-finance.md
│   ├── acumatica-inventory.md
│   ├── acumatica-crm.md
│   └── acumatica-reports.md
└── plugin.json              # Plugin manifest — registers MCP server + skills
```

**Data flow:**
1. Business user asks Claude a natural language question
2. Relevant skill loads and guides Claude's interpretation
3. Claude calls MCP server tools with structured parameters
4. MCP server authenticates (session cached in memory), calls Acumatica REST API
5. Response is returned; Claude formats it for the business user

---

## MCP Tools

### Setup & Auth
| Tool | Purpose |
|------|---------|
| `acumatica_configure` | Save instance URL, company, auth method, credentials to `~/.acumatica-plugin.json` |
| `acumatica_connect` | Establish and cache an authenticated session |
| `acumatica_disconnect` | End the session |

### CRUD Operations
| Tool | Purpose |
|------|---------|
| `acumatica_get` | Read a single record by type + ID |
| `acumatica_list` | List/search records with filters, pagination, field selection |
| `acumatica_create` | Create a new record |
| `acumatica_update` | Update fields on an existing record |
| `acumatica_action` | Trigger a business action (Release, Confirm, Convert, etc.) |

### Reports
| Tool | Purpose |
|------|---------|
| `acumatica_report` | Run a named Acumatica built-in report, return raw data |
| `acumatica_query_summary` | List + filter records for NL summarization by Claude |

### Supported Record Types
- **Finance:** `Invoice`, `Bill`, `Payment`, `JournalEntry`, `CashAccount`
- **Inventory:** `StockItem`, `PurchaseOrder`, `Receipt`, `Vendor`
- **CRM:** `Customer`, `Lead`, `Opportunity`, `Contact`

---

## Authentication & Configuration

### First-time Setup
Guided by `acumatica-setup` skill. Claude prompts user for:
1. Acumatica instance URL (e.g. `https://mycompany.acumatica.com`)
2. Company/tenant name
3. Auth method: Basic or OAuth 2.0
4. Credentials (username+password for Basic; client ID + secret for OAuth)

Config saved to `~/.acumatica-plugin.json`. File permissions are set to owner-only on creation: `chmod 600` on macOS/Linux, `icacls` on Windows.

### Basic Auth (Username/Password)
- POST to `/entity/auth/login` → session cookie cached in memory
- Auto-reconnects on 401 (session expiry)

### OAuth 2.0
- Standard Authorization Code flow; MCP server opens the system browser for the authorization step, then captures the callback on a local redirect URI (e.g. `http://localhost:8085/callback`)
- Access token + refresh token stored in config file
- Token refresh handled transparently by MCP server

### Security Rules
- Config file permissions: `600` (owner read/write only)
- Passwords/secrets never logged
- OAuth tokens never exposed as tool output

---

## Skills

| Skill | Trigger | Responsibilities |
|-------|---------|-----------------|
| `acumatica-setup` | No config exists, or user says "connect to Acumatica" | Walks through `acumatica_configure` + `acumatica_connect`, confirms success |
| `acumatica-finance` | Finance/AP/AR/GL requests | Translates NL to list/get/create/update calls; formats currency tables; maps common workflow actions |
| `acumatica-inventory` | Inventory/PO/vendor requests | Handles PO creation, stock queries, receipt processing |
| `acumatica-crm` | Customer/lead/opportunity requests | Handles CRM record queries, lead creation, opportunity tracking |
| `acumatica-reports` | Report/analysis requests | Maps NL report requests to Acumatica report IDs; runs built-in reports; performs ad-hoc NL summarization |

### Common Report ID Mappings (Finance)
| Natural Language | Acumatica Report ID |
|-----------------|-------------------|
| Aged Receivables | `AR631000` |
| Aged Payables | `AP631000` |
| Trial Balance | `GL632000` |
| Customer Statement | `AR641000` |

---

## Error Handling

| Error | Behavior |
|-------|---------|
| `401 Unauthorized` | Auto re-authenticate; if fails, prompt user to re-run setup |
| `403 Forbidden` | Inform user they lack Acumatica permission for that operation |
| `422 Validation Error` | Surface Acumatica's field-level error messages verbatim |
| `5xx Server Error` | Surface as "Acumatica server error" with status code |
| No config file | Return "Not connected. Ask Claude to set up your Acumatica connection first." |
| Timeout / unreachable | "Cannot reach Acumatica at `<url>`. Check your network or instance URL." |

### Write Safety
Before any `acumatica_create`, `acumatica_update`, or `acumatica_action` call, Claude states what it is about to do and asks the user to confirm. Prevents accidental data changes.

### Pagination
`acumatica_list` returns up to 50 records by default with a `hasMore` flag. Claude informs the user if results are truncated and offers to fetch more.

---

## Out of Scope (v1)
- Local web UI for setup (can be added in v2)
- Webhook / push notifications from Acumatica
- Custom Acumatica screens beyond the supported record types above
- Multi-tenant switching within a single session
