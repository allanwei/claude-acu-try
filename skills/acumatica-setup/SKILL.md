---
name: acumatica-setup
description: >
  This skill should be used when the user says "connect to Acumatica", "set up Acumatica",
  "configure Acumatica", or when any Acumatica tool returns "Not connected". Guides the
  user through first-time connection setup or reconnecting after a config change.
metadata:
  version: "1.0.0"
---

# Acumatica Setup

Guide the user through connecting to their Acumatica ERP system step by step.

## Steps

1. Ask for the **Acumatica instance URL** (e.g. `https://mycompany.acumatica.com`).
2. Ask for the **company name** (the tenant name shown on the Acumatica login page).
3. Ask which **authentication method** they prefer:
   - **Basic** (username + password) — simpler, works for most setups
   - **OAuth 2.0** — more secure, requires an OAuth application registered in Acumatica
4. Collect credentials:
   - For Basic: username and password.
   - For OAuth: client ID and client secret.
5. Call `acumatica_configure` with the collected values.
6. Call `acumatica_connect`.
7. Confirm success: "Connected to Acumatica at `{instanceUrl}`. You can now ask me about invoices, purchase orders, customers, and more."

## Rules

- Never repeat credentials back to the user in plain text after collecting them.
- If `acumatica_connect` fails with "Invalid credentials", ask the user to double-check their username/password and try again.
- If `acumatica_connect` fails with a network error, ask the user to verify the instance URL is correct and accessible.
- For OAuth: after calling `acumatica_connect`, a browser window will open. Tell the user: "A browser window will open for you to authorize access. Please log in and approve the request."
