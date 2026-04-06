# Acumatica Plugin

A plugin for [Claude Cowork](https://www.anthropic.com/) and [Claude Code](https://claude.ai/code) that lets business users interact with [Acumatica ERP](https://www.acumatica.com/) using natural language. Read, write, update, and report across Finance, Inventory/Purchasing, and CRM modules.

## What You Can Do

Ask Claude things like:

- *"Show me all unpaid invoices over $10,000"*
- *"Create a purchase order for 50 units of WIDGET from vendor ACME"*
- *"What are my top 5 customers by balance?"*
- *"Run the aged receivables report"*
- *"Convert lead John Smith to an opportunity"*
- *"Release invoice INV000123"*

## Modules

| Module | Record Types |
|--------|-------------|
| **Finance** | Invoice, Bill, Payment, Journal Entry, Cash Account |
| **Inventory & Purchasing** | Stock Item, Purchase Order, Receipt, Vendor |
| **CRM** | Customer, Lead, Opportunity, Contact |

## Requirements

- [Claude Cowork](https://www.anthropic.com/) desktop app **or** [Claude Code](https://claude.ai/code) CLI
- Node.js 20+
- An Acumatica instance with API access enabled

## Installation

### Claude Cowork (recommended)

1. Download `acumatica.plugin` from the [Releases](https://github.com/allanwei/claude-acu-try/releases) page.
2. In Cowork, open **Settings → Plugins → Install from file** and select `acumatica.plugin`.
3. Cowork automatically builds the MCP server on first use.

### Claude Code (manual)

1. Clone this repository:
   ```bash
   git clone https://github.com/allanwei/claude-acu-try.git
   cd claude-acu-try
   ```

2. Install and build the MCP server:
   ```bash
   cd mcp-server && npm install && npm run build
   ```

3. Register the plugin in Claude Code by pointing it at `plugin.json`.

## Setup

The first time you use the plugin, ask Claude:

> "Connect me to Acumatica"

Claude will walk you through entering your instance URL, company name, and credentials. Two authentication methods are supported:

| Method | When to use |
|--------|------------|
| **Basic** (username + password) | Simpler; works for most setups |
| **OAuth 2.0** | More secure; requires an OAuth app registered in Acumatica |

Connection settings are saved to `~/.acumatica-plugin.json` with owner-only file permissions.

## Usage Examples

### Finance

```
Show me open invoices due this week
List bills from vendor ACME that haven't been paid
Release invoice INV000456
```

### Inventory

```
Which stock items are below reorder point?
Create a PO for 100 units of item WIDGET from vendor ACME at $12.50 each
Confirm purchase order PO000042
```

### CRM

```
Show all open opportunities over $50,000 closing this quarter
Create a new lead: Jane Doe, jane@contoso.com, Contoso Ltd
Convert lead LD000012 to an opportunity
```

### Reports

```
Run aged receivables report
Show me a trial balance
Who are our top 10 customers by balance?
What invoices are overdue this month?
```

> **Write safety:** Before creating, updating, or triggering any action, Claude will always describe what it's about to do and ask for your confirmation.

## Architecture

```
acumatica-plugin/
├── .claude-plugin/
│   └── plugin.json          Cowork plugin manifest
├── .mcp.json                MCP server config (Cowork)
├── plugin.json              Claude Code plugin manifest
├── mcp-server/              Node.js/TypeScript MCP server
│   └── src/
│       ├── index.ts         10 MCP tools
│       ├── config.ts        Connection config (~/.acumatica-plugin.json)
│       ├── auth/
│       │   ├── basic.ts     Session cookie auth
│       │   └── oauth.ts     OAuth 2.0 auth code flow
│       ├── client.ts        Acumatica REST API client
│       ├── modules/         Finance / Inventory / CRM type registries
│       └── reports.ts       Report ID mapping + query summarization
└── skills/                  5 domain skills (Cowork & Claude Code)
    ├── acumatica-setup/
    ├── acumatica-finance/
    ├── acumatica-inventory/
    ├── acumatica-crm/
    └── acumatica-reports/
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `acumatica_configure` | Save connection settings |
| `acumatica_connect` | Establish authenticated session |
| `acumatica_disconnect` | End session |
| `acumatica_get` | Read a single record by type + ID |
| `acumatica_list` | List/search records with OData filter |
| `acumatica_create` | Create a new record |
| `acumatica_update` | Update an existing record |
| `acumatica_action` | Trigger a business action (Release, Confirm, etc.) |
| `acumatica_report` | Run a named built-in report |
| `acumatica_query_summary` | Query records for ad-hoc analysis |

## Development

```bash
cd mcp-server

# Run tests
npm test

# Build
npm run build

# Verify server starts and lists tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

**25 tests, 4 test suites** covering config, auth, HTTP client, and reports.
