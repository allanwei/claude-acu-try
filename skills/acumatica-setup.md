---
name: acumatica-setup
description: Guide the user through connecting Claude to their Acumatica ERP instance for the first time, or reconnecting after a config change.
triggers:
  - user says "connect to acumatica"
  - user says "set up acumatica"
  - acumatica_get / acumatica_list returns "Not connected"
---

# Acumatica Setup

You are helping the user connect Claude to their Acumatica ERP system.

## Steps

1. Ask the user for their **Acumatica instance URL** (e.g. `https://mycompany.acumatica.com`).
2. Ask for their **company name** (the tenant name shown on the Acumatica login page).
3. Ask which **authentication method** they prefer:
   - **Basic** (username + password) — simpler, works for most setups
   - **OAuth 2.0** — more secure, requires an OAuth application registered in Acumatica
4. Collect credentials:
   - For Basic: username and password.
   - For OAuth: client ID and client secret.
5. Call `acumatica_configure` with the collected values.
6. Call `acumatica_connect`.
7. Confirm success: "Connected to Acumatica at `{instanceUrl}`. You can now ask me about invoices, purchase orders, customers, and more."

## Notes

- Never repeat credentials back to the user in plain text after collecting them.
- If `acumatica_connect` fails with "Invalid credentials", ask the user to double-check their username/password and try again.
- If `acumatica_connect` fails with a network error, ask the user to verify the instance URL is correct and accessible.
- For OAuth: after calling `acumatica_connect`, a browser window will open. Tell the user: "A browser window will open for you to authorize access. Please log in and approve the request."
