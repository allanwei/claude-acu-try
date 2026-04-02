# Acumatica Claude Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code plugin with an MCP server that lets business users read, write, update, and report on Acumatica ERP data using natural language.

**Architecture:** A Node.js/TypeScript MCP server exposes 10 tools covering auth, CRUD, and reporting. Five skills teach Claude how to translate business user requests into those tool calls. A `plugin.json` manifest wires the server and skills together.

**Tech Stack:** Node.js 20+, TypeScript 5, `@modelcontextprotocol/sdk`, `axios`, `open` (browser OAuth), `jest` + `ts-jest`, `nock` (HTTP mocking)

---

## File Map

| File | Responsibility |
|------|---------------|
| `mcp-server/package.json` | Dependencies and build scripts |
| `mcp-server/tsconfig.json` | TypeScript config |
| `mcp-server/src/types.ts` | Shared interfaces (config, records, tool params) |
| `mcp-server/src/config.ts` | Load/save `~/.acumatica-plugin.json`, set file permissions |
| `mcp-server/src/auth/basic.ts` | Cookie session login/logout, auto-reconnect |
| `mcp-server/src/auth/oauth.ts` | OAuth 2.0 auth code flow, token refresh |
| `mcp-server/src/client.ts` | Axios HTTP client, injects auth, handles errors, pagination |
| `mcp-server/src/modules/finance.ts` | Finance record type registry + endpoint map |
| `mcp-server/src/modules/inventory.ts` | Inventory record type registry + endpoint map |
| `mcp-server/src/modules/crm.ts` | CRM record type registry + endpoint map |
| `mcp-server/src/reports.ts` | Report ID → inquiry endpoint map, report runner |
| `mcp-server/src/index.ts` | MCP server entry, all tool definitions and handlers |
| `mcp-server/src/tests/config.test.ts` | Config load/save/permissions tests |
| `mcp-server/src/tests/auth-basic.test.ts` | Basic auth unit tests |
| `mcp-server/src/tests/client.test.ts` | HTTP client integration tests (nock) |
| `mcp-server/src/tests/reports.test.ts` | Report routing tests |
| `skills/acumatica-setup.md` | Setup skill |
| `skills/acumatica-finance.md` | Finance skill |
| `skills/acumatica-inventory.md` | Inventory skill |
| `skills/acumatica-crm.md` | CRM skill |
| `skills/acumatica-reports.md` | Reports skill |
| `plugin.json` | Plugin manifest |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `mcp-server/package.json`
- Create: `mcp-server/tsconfig.json`
- Create: `mcp-server/jest.config.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "acumatica-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for Acumatica ERP",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "jest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "axios": "^1.6.0",
    "open": "^10.0.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.7.0",
    "nock": "^14.0.0",
    "ts-jest": "^29.2.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/tests/**/*", "dist"]
}
```

- [ ] **Step 3: Create jest.config.js**

```js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  testMatch: ['**/tests/**/*.test.ts'],
};
```

- [ ] **Step 4: Install dependencies**

Run: `cd mcp-server && npm install`

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Commit**

```bash
git add mcp-server/package.json mcp-server/tsconfig.json mcp-server/jest.config.js
git commit -m "chore: scaffold mcp-server project"
```

---

## Task 2: Shared Types

**Files:**
- Create: `mcp-server/src/types.ts`

- [ ] **Step 1: Write types.ts**

```typescript
// mcp-server/src/types.ts

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms timestamp
}

export interface AcumaticaConfig {
  instanceUrl: string;   // e.g. https://mycompany.acumatica.com
  company: string;       // Acumatica tenant/company name
  authMethod: 'basic' | 'oauth';
  // Basic auth
  username?: string;
  password?: string;
  // OAuth
  clientId?: string;
  clientSecret?: string;
  oauthTokens?: OAuthTokens;
}

export interface AcumaticaRecord {
  id?: string;
  [key: string]: unknown;
}

export interface ListResult {
  records: AcumaticaRecord[];
  hasMore: boolean;
  total?: number;
}

export interface AcumaticaError {
  message: string;
  details?: string;
}

// MCP tool parameter shapes
export interface ConfigureParams {
  instanceUrl: string;
  company: string;
  authMethod: 'basic' | 'oauth';
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface GetParams {
  type: string;
  id: string;
}

export interface ListParams {
  type: string;
  filter?: string;
  top?: number;
  select?: string[];
  expand?: string[];
}

export interface CreateParams {
  type: string;
  data: Record<string, unknown>;
}

export interface UpdateParams {
  type: string;
  id: string;
  data: Record<string, unknown>;
}

export interface ActionParams {
  type: string;
  id: string;
  action: string;
  parameters?: Record<string, unknown>;
}

export interface ReportParams {
  reportId: string;
  parameters?: Record<string, unknown>;
}

export interface QuerySummaryParams {
  type: string;
  filter?: string;
  top?: number;
  select?: string[];
}
```

- [ ] **Step 2: Commit**

```bash
git add mcp-server/src/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Config Module

**Files:**
- Create: `mcp-server/src/config.ts`
- Create: `mcp-server/src/tests/config.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// mcp-server/src/tests/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Override config path for tests
process.env.ACUMATICA_CONFIG_PATH = path.join(os.tmpdir(), '.acumatica-test.json');

import { loadConfig, saveConfig, CONFIG_PATH } from '../config.js';
import type { AcumaticaConfig } from '../types.js';

const TEST_CONFIG: AcumaticaConfig = {
  instanceUrl: 'https://test.acumatica.com',
  company: 'TestCo',
  authMethod: 'basic',
  username: 'admin',
  password: 'secret',
};

afterEach(() => {
  if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
});

describe('loadConfig', () => {
  it('returns null when config file does not exist', () => {
    expect(loadConfig()).toBeNull();
  });

  it('returns parsed config when file exists', () => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(TEST_CONFIG));
    expect(loadConfig()).toEqual(TEST_CONFIG);
  });
});

describe('saveConfig', () => {
  it('writes config to disk and reads it back', () => {
    saveConfig(TEST_CONFIG);
    expect(loadConfig()).toEqual(TEST_CONFIG);
  });

  it('creates file with restricted permissions on unix', () => {
    if (process.platform === 'win32') return;
    saveConfig(TEST_CONFIG);
    const mode = fs.statSync(CONFIG_PATH).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mcp-server && npx jest src/tests/config.test.ts --no-coverage`

Expected: FAIL — "Cannot find module '../config.js'"

- [ ] **Step 3: Implement config.ts**

```typescript
// mcp-server/src/config.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import type { AcumaticaConfig } from './types.js';

export const CONFIG_PATH: string =
  process.env.ACUMATICA_CONFIG_PATH ??
  path.join(os.homedir(), '.acumatica-plugin.json');

export function loadConfig(): AcumaticaConfig | null {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as AcumaticaConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: AcumaticaConfig): void {
  const json = JSON.stringify(config, null, 2);
  fs.writeFileSync(CONFIG_PATH, json, { encoding: 'utf-8' });
  setRestrictedPermissions(CONFIG_PATH);
}

function setRestrictedPermissions(filePath: string): void {
  if (process.platform === 'win32') {
    try {
      execSync(
        `icacls "${filePath}" /inheritance:r /grant:r "%USERNAME%:(R,W)"`,
        { stdio: 'ignore' }
      );
    } catch {
      // Best-effort on Windows
    }
  } else {
    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      // Best-effort
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mcp-server && npx jest src/tests/config.test.ts --no-coverage`

Expected: PASS — 4 tests pass (3 on Unix, 3 on Windows — permission test skipped on Windows)

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/config.ts mcp-server/src/tests/config.test.ts
git commit -m "feat: add config load/save with restricted file permissions"
```

---

## Task 4: Basic Auth Module

**Files:**
- Create: `mcp-server/src/auth/basic.ts`
- Create: `mcp-server/src/tests/auth-basic.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// mcp-server/src/tests/auth-basic.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import nock from 'nock';
import { BasicAuthSession } from '../auth/basic.js';

const BASE_URL = 'https://test.acumatica.com';
const COMPANY = 'TestCo';

beforeEach(() => nock.cleanAll());
afterEach(() => nock.cleanAll());

describe('BasicAuthSession.login', () => {
  it('stores session cookie on successful login', async () => {
    nock(BASE_URL)
      .post('/TestCo/entity/auth/login', { name: 'admin', password: 'pass', company: 'TestCo' })
      .reply(204, '', { 'set-cookie': ['ASP.NET_SessionId=abc123; path=/'] });

    const session = new BasicAuthSession(BASE_URL, COMPANY);
    await session.login('admin', 'pass');
    expect(session.getCookie()).toBe('ASP.NET_SessionId=abc123');
  });

  it('throws on bad credentials', async () => {
    nock(BASE_URL)
      .post('/TestCo/entity/auth/login')
      .reply(401, { message: 'Invalid credentials' });

    const session = new BasicAuthSession(BASE_URL, COMPANY);
    await expect(session.login('admin', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});

describe('BasicAuthSession.logout', () => {
  it('clears cookie on logout', async () => {
    nock(BASE_URL).post('/TestCo/entity/auth/logout').reply(204);

    const session = new BasicAuthSession(BASE_URL, COMPANY);
    // Manually set cookie to simulate logged-in state
    (session as any)._cookie = 'ASP.NET_SessionId=abc123';
    await session.logout();
    expect(session.getCookie()).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd mcp-server && npx jest src/tests/auth-basic.test.ts --no-coverage`

Expected: FAIL — "Cannot find module '../auth/basic.js'"

- [ ] **Step 3: Implement auth/basic.ts**

```typescript
// mcp-server/src/auth/basic.ts
import axios from 'axios';

export class BasicAuthSession {
  private _cookie: string | null = null;

  constructor(
    private readonly instanceUrl: string,
    private readonly company: string
  ) {}

  get isLoggedIn(): boolean {
    return this._cookie !== null;
  }

  getCookie(): string | null {
    return this._cookie;
  }

  async login(username: string, password: string): Promise<void> {
    const url = `${this.instanceUrl}/${this.company}/entity/auth/login`;
    const resp = await axios.post(
      url,
      { name: username, password, company: this.company },
      { validateStatus: () => true }
    );

    if (resp.status === 401 || resp.status === 403) {
      const msg = resp.data?.message ?? 'Invalid credentials';
      throw new Error(msg);
    }
    if (resp.status >= 400) {
      throw new Error(`Login failed with status ${resp.status}`);
    }

    const setCookie = resp.headers['set-cookie'];
    if (setCookie && setCookie.length > 0) {
      // Extract only the name=value part of the first cookie
      this._cookie = setCookie[0].split(';')[0];
    }
  }

  async logout(): Promise<void> {
    if (!this._cookie) return;
    const url = `${this.instanceUrl}/${this.company}/entity/auth/logout`;
    try {
      await axios.post(url, {}, {
        headers: { Cookie: this._cookie },
        validateStatus: () => true,
      });
    } finally {
      this._cookie = null;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mcp-server && npx jest src/tests/auth-basic.test.ts --no-coverage`

Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/auth/basic.ts mcp-server/src/tests/auth-basic.test.ts
git commit -m "feat: add basic auth session with login/logout"
```

---

## Task 5: OAuth 2.0 Module

**Files:**
- Create: `mcp-server/src/auth/oauth.ts`

(OAuth flow involves browser + HTTP server — unit tested via integration; not mocked in this plan.)

- [ ] **Step 1: Implement auth/oauth.ts**

```typescript
// mcp-server/src/auth/oauth.ts
import axios from 'axios';
import * as http from 'http';
import * as url from 'url';
import * as crypto from 'crypto';
import open from 'open';
import type { AcumaticaConfig, OAuthTokens } from '../types.js';
import { saveConfig, loadConfig } from '../config.js';

const REDIRECT_PORT = 8085;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

export class OAuthSession {
  private _accessToken: string | null = null;

  constructor(private readonly instanceUrl: string) {}

  get accessToken(): string | null {
    return this._accessToken;
  }

  /** Run the Authorization Code flow. Opens system browser, captures callback. */
  async authorize(clientId: string, clientSecret: string): Promise<OAuthTokens> {
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = new URL(`${this.instanceUrl}/identity/connect/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', 'api offline_access');
    authUrl.searchParams.set('state', state);

    const code = await this._waitForCode(authUrl.toString(), state);
    return this._exchangeCode(code, clientId, clientSecret);
  }

  /** Refresh tokens using the stored refresh_token. */
  async refresh(clientId: string, clientSecret: string, refreshToken: string): Promise<OAuthTokens> {
    const tokenUrl = `${this.instanceUrl}/identity/connect/token`;
    const resp = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return this._toTokens(resp.data);
  }

  /** Load tokens from config; refresh if expired. Returns valid access token. */
  async getValidToken(clientId: string, clientSecret: string): Promise<string> {
    const config = loadConfig();
    if (!config?.oauthTokens) throw new Error('No OAuth tokens found. Please re-authorize.');

    const { accessToken, refreshToken, expiresAt } = config.oauthTokens;
    if (Date.now() < expiresAt - 60_000) {
      this._accessToken = accessToken;
      return accessToken;
    }

    // Token expired — refresh
    const tokens = await this.refresh(clientId, clientSecret, refreshToken);
    const updated: AcumaticaConfig = { ...config, oauthTokens: tokens };
    saveConfig(updated);
    this._accessToken = tokens.accessToken;
    return tokens.accessToken;
  }

  private _waitForCode(authUrl: string, state: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const parsed = url.parse(req.url ?? '', true);
        if (parsed.pathname !== '/callback') return;

        const { code, state: returnedState, error } = parsed.query;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization complete. You may close this tab.</h1>');
        server.close();

        if (error) return reject(new Error(`OAuth error: ${error}`));
        if (returnedState !== state) return reject(new Error('OAuth state mismatch'));
        if (!code) return reject(new Error('No code returned'));
        resolve(code as string);
      });

      server.listen(REDIRECT_PORT, () => open(authUrl));
      server.on('error', reject);
    });
  }

  private async _exchangeCode(code: string, clientId: string, clientSecret: string): Promise<OAuthTokens> {
    const tokenUrl = `${this.instanceUrl}/identity/connect/token`;
    const resp = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return this._toTokens(resp.data);
  }

  private _toTokens(data: Record<string, unknown>): OAuthTokens {
    const expiresIn = (data.expires_in as number) ?? 3600;
    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string,
      expiresAt: Date.now() + expiresIn * 1000,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add mcp-server/src/auth/oauth.ts
git commit -m "feat: add OAuth 2.0 auth code flow with token refresh"
```

---

## Task 6: HTTP Client

**Files:**
- Create: `mcp-server/src/client.ts`
- Create: `mcp-server/src/tests/client.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// mcp-server/src/tests/client.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import nock from 'nock';
import { AcumaticaClient } from '../client.js';

const BASE = 'https://test.acumatica.com';
const COMPANY = 'TestCo';
const API = `/${COMPANY}/entity/Default/23.200.001`;

function makeClient() {
  const client = new AcumaticaClient(BASE, COMPANY);
  (client as any)._cookie = 'ASP.NET_SessionId=abc';
  return client;
}

beforeEach(() => nock.cleanAll());
afterEach(() => nock.cleanAll());

describe('AcumaticaClient.get', () => {
  it('fetches a single record by id', async () => {
    nock(BASE).get(`${API}/Invoice/INV001`).reply(200, { ReferenceNbr: 'INV001', Amount: 500 });
    const client = makeClient();
    const result = await client.get('Invoice', 'INV001');
    expect(result).toEqual({ ReferenceNbr: 'INV001', Amount: 500 });
  });

  it('throws descriptive error on 404', async () => {
    nock(BASE).get(`${API}/Invoice/MISSING`).reply(404);
    const client = makeClient();
    await expect(client.get('Invoice', 'MISSING')).rejects.toThrow('Invoice MISSING not found');
  });
});

describe('AcumaticaClient.list', () => {
  it('returns records and hasMore=false when count <= top', async () => {
    const records = [{ ReferenceNbr: 'INV001' }];
    nock(BASE).get(`${API}/Invoice`).query(true).reply(200, records);
    const client = makeClient();
    const result = await client.list('Invoice', { top: 50 });
    expect(result.records).toEqual(records);
    expect(result.hasMore).toBe(false);
  });

  it('sets hasMore=true when returned count equals top', async () => {
    const records = Array(50).fill({ ReferenceNbr: 'X' });
    nock(BASE).get(`${API}/Invoice`).query(true).reply(200, records);
    const client = makeClient();
    const result = await client.list('Invoice', { top: 50 });
    expect(result.hasMore).toBe(true);
  });
});

describe('AcumaticaClient.create', () => {
  it('sends PUT and returns created record', async () => {
    nock(BASE).put(`${API}/Customer`).reply(200, { CustomerID: 'CUST001' });
    const client = makeClient();
    const result = await client.create('Customer', { CustomerName: 'Acme' });
    expect(result).toEqual({ CustomerID: 'CUST001' });
  });
});

describe('AcumaticaClient.update', () => {
  it('sends PUT with id and returns updated record', async () => {
    nock(BASE).put(`${API}/Customer/CUST001`).reply(200, { CustomerID: 'CUST001', CustomerName: 'Acme 2' });
    const client = makeClient();
    const result = await client.update('Customer', 'CUST001', { CustomerName: 'Acme 2' });
    expect(result).toEqual({ CustomerID: 'CUST001', CustomerName: 'Acme 2' });
  });
});

describe('AcumaticaClient error handling', () => {
  it('throws permission error on 403', async () => {
    nock(BASE).get(`${API}/Invoice/X`).reply(403);
    const client = makeClient();
    await expect(client.get('Invoice', 'X')).rejects.toThrow('You do not have permission');
  });

  it('surfaces validation messages on 422', async () => {
    nock(BASE).put(`${API}/Invoice`).reply(422, { message: 'Amount must be positive' });
    const client = makeClient();
    await expect(client.create('Invoice', {})).rejects.toThrow('Amount must be positive');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd mcp-server && npx jest src/tests/client.test.ts --no-coverage`

Expected: FAIL — "Cannot find module '../client.js'"

- [ ] **Step 3: Implement client.ts**

```typescript
// mcp-server/src/client.ts
import axios, { type AxiosInstance } from 'axios';
import type { AcumaticaRecord, ListResult, ListParams } from './types.js';

const API_VERSION = '23.200.001';

export class AcumaticaClient {
  private _cookie: string | null = null;
  private _oauthToken: string | null = null;
  private readonly http: AxiosInstance;

  constructor(
    private readonly instanceUrl: string,
    private readonly company: string
  ) {
    this.http = axios.create({
      baseURL: `${instanceUrl}/${company}/entity/Default/${API_VERSION}`,
      timeout: 30_000,
    });
  }

  setBasicAuth(cookie: string): void {
    this._cookie = cookie;
    this._oauthToken = null;
  }

  setOAuthToken(token: string): void {
    this._oauthToken = token;
    this._cookie = null;
  }

  private authHeaders(): Record<string, string> {
    if (this._cookie) return { Cookie: this._cookie };
    if (this._oauthToken) return { Authorization: `Bearer ${this._oauthToken}` };
    return {};
  }

  async get(type: string, id: string): Promise<AcumaticaRecord> {
    const resp = await this.http.get(`/${type}/${id}`, {
      headers: this.authHeaders(),
      validateStatus: () => true,
    });
    this.throwOnError(resp.status, resp.data, `${type} ${id} not found`);
    return resp.data as AcumaticaRecord;
  }

  async list(type: string, params: Omit<ListParams, 'type'> = {}): Promise<ListResult> {
    const top = params.top ?? 50;
    const query: Record<string, string> = { $top: String(top) };
    if (params.filter) query['$filter'] = params.filter;
    if (params.select?.length) query['$select'] = params.select.join(',');
    if (params.expand?.length) query['$expand'] = params.expand.join(',');

    const resp = await this.http.get(`/${type}`, {
      params: query,
      headers: this.authHeaders(),
      validateStatus: () => true,
    });
    this.throwOnError(resp.status, resp.data);
    const records = resp.data as AcumaticaRecord[];
    return { records, hasMore: records.length >= top };
  }

  async create(type: string, data: Record<string, unknown>): Promise<AcumaticaRecord> {
    const resp = await this.http.put(`/${type}`, data, {
      headers: this.authHeaders(),
      validateStatus: () => true,
    });
    this.throwOnError(resp.status, resp.data);
    return resp.data as AcumaticaRecord;
  }

  async update(type: string, id: string, data: Record<string, unknown>): Promise<AcumaticaRecord> {
    const resp = await this.http.put(`/${type}/${id}`, data, {
      headers: this.authHeaders(),
      validateStatus: () => true,
    });
    this.throwOnError(resp.status, resp.data);
    return resp.data as AcumaticaRecord;
  }

  async action(type: string, id: string, actionName: string, parameters?: Record<string, unknown>): Promise<void> {
    const body = parameters ? { entity: parameters } : {};
    const resp = await this.http.post(`/${type}/${id}/${actionName}`, body, {
      headers: this.authHeaders(),
      validateStatus: () => true,
    });
    this.throwOnError(resp.status, resp.data);
  }

  private throwOnError(status: number, data: unknown, notFoundMsg?: string): void {
    if (status >= 200 && status < 300) return;

    const msg = (data as Record<string, string>)?.message ?? '';

    switch (true) {
      case status === 401:
        throw Object.assign(new Error('Session expired. Reconnect required.'), { code: 'SESSION_EXPIRED' });
      case status === 403:
        throw new Error(`You do not have permission to perform this action in Acumatica.`);
      case status === 404:
        throw new Error(notFoundMsg ?? `Record not found (404).`);
      case status === 422:
        throw new Error(msg || 'Validation error from Acumatica.');
      case status >= 500:
        throw new Error(`Acumatica server error (${status}). Try again later.`);
      default:
        throw new Error(`Unexpected error (${status}): ${msg}`);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mcp-server && npx jest src/tests/client.test.ts --no-coverage`

Expected: PASS — 8 tests pass

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/client.ts mcp-server/src/tests/client.test.ts
git commit -m "feat: add Acumatica REST API HTTP client with error handling"
```

---

## Task 7: Module Registries (Finance, Inventory, CRM)

**Files:**
- Create: `mcp-server/src/modules/finance.ts`
- Create: `mcp-server/src/modules/inventory.ts`
- Create: `mcp-server/src/modules/crm.ts`
- Create: `mcp-server/src/modules/index.ts`

- [ ] **Step 1: Implement finance.ts**

```typescript
// mcp-server/src/modules/finance.ts

/** Maps user-facing record type names to Acumatica API entity names */
export const FINANCE_TYPES: Record<string, string> = {
  Invoice: 'Invoice',
  Bill: 'Bill',
  Payment: 'Payment',
  JournalEntry: 'JournalTransaction',
  CashAccount: 'CashAccount',
};

/** Maps common action names per Finance type */
export const FINANCE_ACTIONS: Record<string, string[]> = {
  Invoice: ['Release', 'Void', 'ApplyPayment'],
  Bill: ['Release', 'Void'],
  Payment: ['Release', 'Void'],
  JournalEntry: ['Release'],
  CashAccount: [],
};

export function isFinanceType(type: string): boolean {
  return type in FINANCE_TYPES;
}

export function resolveFinanceEntity(type: string): string {
  return FINANCE_TYPES[type] ?? type;
}
```

- [ ] **Step 2: Implement inventory.ts**

```typescript
// mcp-server/src/modules/inventory.ts

export const INVENTORY_TYPES: Record<string, string> = {
  StockItem: 'StockItem',
  PurchaseOrder: 'PurchaseOrder',
  Receipt: 'PurchaseReceipt',
  Vendor: 'Vendor',
};

export const INVENTORY_ACTIONS: Record<string, string[]> = {
  PurchaseOrder: ['ConfirmPurchaseOrder', 'CancelPurchaseOrder'],
  Receipt: ['Release'],
  StockItem: [],
  Vendor: [],
};

export function isInventoryType(type: string): boolean {
  return type in INVENTORY_TYPES;
}

export function resolveInventoryEntity(type: string): string {
  return INVENTORY_TYPES[type] ?? type;
}
```

- [ ] **Step 3: Implement crm.ts**

```typescript
// mcp-server/src/modules/crm.ts

export const CRM_TYPES: Record<string, string> = {
  Customer: 'Customer',
  Lead: 'Lead',
  Opportunity: 'CRMOpportunity',
  Contact: 'Contact',
};

export const CRM_ACTIONS: Record<string, string[]> = {
  Lead: ['ConvertToOpportunity', 'ConvertToContact'],
  Opportunity: ['Close', 'Win', 'Lose'],
  Customer: [],
  Contact: [],
};

export function isCrmType(type: string): boolean {
  return type in CRM_TYPES;
}

export function resolveCrmEntity(type: string): string {
  return CRM_TYPES[type] ?? type;
}
```

- [ ] **Step 4: Implement modules/index.ts (unified resolver)**

```typescript
// mcp-server/src/modules/index.ts
import { FINANCE_TYPES, FINANCE_ACTIONS, isFinanceType, resolveFinanceEntity } from './finance.js';
import { INVENTORY_TYPES, INVENTORY_ACTIONS, isInventoryType, resolveInventoryEntity } from './inventory.js';
import { CRM_TYPES, CRM_ACTIONS, isCrmType, resolveCrmEntity } from './crm.js';

export const ALL_TYPES = { ...FINANCE_TYPES, ...INVENTORY_TYPES, ...CRM_TYPES };
export const ALL_ACTIONS = { ...FINANCE_ACTIONS, ...INVENTORY_ACTIONS, ...CRM_ACTIONS };

export function resolveEntity(type: string): string {
  if (isFinanceType(type)) return resolveFinanceEntity(type);
  if (isInventoryType(type)) return resolveInventoryEntity(type);
  if (isCrmType(type)) return resolveCrmEntity(type);
  throw new Error(
    `Unknown record type "${type}". Supported types: ${Object.keys(ALL_TYPES).join(', ')}`
  );
}

export function supportedActionsFor(type: string): string[] {
  return ALL_ACTIONS[type] ?? [];
}

export { isFinanceType, isInventoryType, isCrmType };
```

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/modules/
git commit -m "feat: add Finance, Inventory, CRM module registries"
```

---

## Task 8: Reports Module

**Files:**
- Create: `mcp-server/src/reports.ts`
- Create: `mcp-server/src/tests/reports.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// mcp-server/src/tests/reports.test.ts
import { describe, it, expect } from '@jest/globals';
import { resolveReportEntity, REPORT_MAP } from '../reports.js';

describe('resolveReportEntity', () => {
  it('maps AR631000 to AgedReceivable', () => {
    expect(resolveReportEntity('AR631000')).toBe('AgedReceivable');
  });

  it('maps AP631000 to AgedPayable', () => {
    expect(resolveReportEntity('AP631000')).toBe('AgedPayable');
  });

  it('throws for unknown report ID', () => {
    expect(() => resolveReportEntity('XX999999')).toThrow('Unknown report ID');
  });
});

describe('REPORT_MAP', () => {
  it('contains all 4 expected reports', () => {
    expect(Object.keys(REPORT_MAP)).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd mcp-server && npx jest src/tests/reports.test.ts --no-coverage`

Expected: FAIL — "Cannot find module '../reports.js'"

- [ ] **Step 3: Implement reports.ts**

```typescript
// mcp-server/src/reports.ts
import type { AcumaticaClient } from './client.js';
import type { AcumaticaRecord } from './types.js';

/** Maps Acumatica report IDs to their equivalent inquiry entity names in the Default endpoint */
export const REPORT_MAP: Record<string, string> = {
  AR631000: 'AgedReceivable',
  AP631000: 'AgedPayable',
  GL632000: 'TrialBalance',
  AR641000: 'CustomerStatement',
};

export function resolveReportEntity(reportId: string): string {
  const entity = REPORT_MAP[reportId];
  if (!entity) {
    const known = Object.keys(REPORT_MAP).join(', ');
    throw new Error(`Unknown report ID "${reportId}". Known reports: ${known}`);
  }
  return entity;
}

/**
 * Run a named report by its Acumatica report ID.
 * Maps the report ID to the corresponding inquiry entity and fetches records.
 */
export async function runReport(
  client: AcumaticaClient,
  reportId: string,
  parameters?: Record<string, unknown>
): Promise<AcumaticaRecord[]> {
  const entity = resolveReportEntity(reportId);
  const filter = parameters?.filter as string | undefined;
  const result = await client.list(entity, { filter, top: 200 });
  return result.records;
}

/**
 * Query records for natural-language summarization.
 * Returns up to `top` records with optional filter and field selection.
 */
export async function querySummary(
  client: AcumaticaClient,
  type: string,
  filter?: string,
  top = 50,
  select?: string[]
): Promise<AcumaticaRecord[]> {
  const result = await client.list(type, { filter, top, select });
  return result.records;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mcp-server && npx jest src/tests/reports.test.ts --no-coverage`

Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/reports.ts mcp-server/src/tests/reports.test.ts
git commit -m "feat: add reports module with report ID mapping"
```

---

## Task 9: MCP Server Entry Point

**Files:**
- Create: `mcp-server/src/index.ts`

- [ ] **Step 1: Implement index.ts**

```typescript
// mcp-server/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig, saveConfig } from './config.js';
import { BasicAuthSession } from './auth/basic.js';
import { OAuthSession } from './auth/oauth.js';
import { AcumaticaClient } from './client.js';
import { resolveEntity, supportedActionsFor } from './modules/index.js';
import { runReport, querySummary } from './reports.js';
import type {
  ConfigureParams, GetParams, ListParams, CreateParams,
  UpdateParams, ActionParams, ReportParams, QuerySummaryParams,
} from './types.js';

// --- Session state (in-memory) ---
let client: AcumaticaClient | null = null;
let basicSession: BasicAuthSession | null = null;
let oauthSession: OAuthSession | null = null;

function requireClient(): AcumaticaClient {
  if (!client) {
    throw new Error('Not connected to Acumatica. Ask Claude to set up your connection first.');
  }
  return client;
}

// --- MCP Server setup ---
const server = new Server(
  { name: 'acumatica-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'acumatica_configure',
      description: 'Save Acumatica connection settings (instance URL, company, auth credentials).',
      inputSchema: {
        type: 'object',
        properties: {
          instanceUrl: { type: 'string', description: 'e.g. https://mycompany.acumatica.com' },
          company: { type: 'string', description: 'Acumatica company/tenant name' },
          authMethod: { type: 'string', enum: ['basic', 'oauth'] },
          username: { type: 'string' },
          password: { type: 'string' },
          clientId: { type: 'string' },
          clientSecret: { type: 'string' },
        },
        required: ['instanceUrl', 'company', 'authMethod'],
      },
    },
    {
      name: 'acumatica_connect',
      description: 'Establish an authenticated session using saved configuration.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'acumatica_disconnect',
      description: 'End the current Acumatica session.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'acumatica_get',
      description: 'Read a single Acumatica record by type and ID.',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Record type, e.g. Invoice, Customer, PurchaseOrder' },
          id: { type: 'string', description: 'Record ID or reference number' },
        },
        required: ['type', 'id'],
      },
    },
    {
      name: 'acumatica_list',
      description: 'List or search Acumatica records with optional OData filter.',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          filter: { type: 'string', description: 'OData $filter expression, e.g. Status eq \'Open\'' },
          top: { type: 'number', description: 'Max records to return (default 50)' },
          select: { type: 'array', items: { type: 'string' }, description: 'Fields to return' },
        },
        required: ['type'],
      },
    },
    {
      name: 'acumatica_create',
      description: 'Create a new Acumatica record.',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          data: { type: 'object', description: 'Field values for the new record' },
        },
        required: ['type', 'data'],
      },
    },
    {
      name: 'acumatica_update',
      description: 'Update an existing Acumatica record.',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          id: { type: 'string' },
          data: { type: 'object', description: 'Fields to update' },
        },
        required: ['type', 'id', 'data'],
      },
    },
    {
      name: 'acumatica_action',
      description: 'Trigger a business action on a record, e.g. Release an invoice or Confirm a PO.',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          id: { type: 'string' },
          action: { type: 'string', description: 'Action name, e.g. Release, ConfirmPurchaseOrder' },
          parameters: { type: 'object' },
        },
        required: ['type', 'id', 'action'],
      },
    },
    {
      name: 'acumatica_report',
      description: 'Run a named Acumatica built-in report by report ID.',
      inputSchema: {
        type: 'object',
        properties: {
          reportId: { type: 'string', description: 'e.g. AR631000 (Aged Receivables)' },
          parameters: { type: 'object' },
        },
        required: ['reportId'],
      },
    },
    {
      name: 'acumatica_query_summary',
      description: 'Query records for natural-language analysis and summarization.',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          filter: { type: 'string' },
          top: { type: 'number' },
          select: { type: 'array', items: { type: 'string' } },
        },
        required: ['type'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'acumatica_configure': {
        const p = args as unknown as ConfigureParams;
        saveConfig({
          instanceUrl: p.instanceUrl.replace(/\/$/, ''),
          company: p.company,
          authMethod: p.authMethod,
          username: p.username,
          password: p.password,
          clientId: p.clientId,
          clientSecret: p.clientSecret,
        });
        return { content: [{ type: 'text', text: 'Configuration saved. Call acumatica_connect to establish a session.' }] };
      }

      case 'acumatica_connect': {
        const config = loadConfig();
        if (!config) return { content: [{ type: 'text', text: 'No configuration found. Please run acumatica_configure first.' }] };

        client = new AcumaticaClient(config.instanceUrl, config.company);

        if (config.authMethod === 'basic') {
          if (!config.username || !config.password) throw new Error('Username and password required for basic auth.');
          basicSession = new BasicAuthSession(config.instanceUrl, config.company);
          await basicSession.login(config.username, config.password);
          client.setBasicAuth(basicSession.getCookie()!);
        } else {
          if (!config.clientId || !config.clientSecret) throw new Error('clientId and clientSecret required for OAuth.');
          oauthSession = new OAuthSession(config.instanceUrl);
          const token = config.oauthTokens
            ? await oauthSession.getValidToken(config.clientId, config.clientSecret)
            : await (async () => {
                const tokens = await oauthSession!.authorize(config.clientId!, config.clientSecret!);
                saveConfig({ ...config, oauthTokens: tokens });
                return tokens.accessToken;
              })();
          client.setOAuthToken(token);
        }

        return { content: [{ type: 'text', text: `Connected to Acumatica (${config.instanceUrl}, company: ${config.company}).` }] };
      }

      case 'acumatica_disconnect': {
        if (basicSession) await basicSession.logout();
        client = null;
        basicSession = null;
        oauthSession = null;
        return { content: [{ type: 'text', text: 'Disconnected from Acumatica.' }] };
      }

      case 'acumatica_get': {
        const { type, id } = args as unknown as GetParams;
        const entity = resolveEntity(type);
        const record = await requireClient().get(entity, id);
        return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] };
      }

      case 'acumatica_list': {
        const { type, filter, top, select } = args as unknown as ListParams;
        const entity = resolveEntity(type);
        const result = await requireClient().list(entity, { filter, top, select });
        const summary = result.hasMore ? `\n\n(Showing first ${top ?? 50} records. There may be more.)` : '';
        return { content: [{ type: 'text', text: JSON.stringify(result.records, null, 2) + summary }] };
      }

      case 'acumatica_create': {
        const { type, data } = args as unknown as CreateParams;
        const entity = resolveEntity(type);
        const record = await requireClient().create(entity, data);
        return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] };
      }

      case 'acumatica_update': {
        const { type, id, data } = args as unknown as UpdateParams;
        const entity = resolveEntity(type);
        const record = await requireClient().update(entity, id, data);
        return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] };
      }

      case 'acumatica_action': {
        const { type, id, action, parameters } = args as unknown as ActionParams;
        const entity = resolveEntity(type);
        const supported = supportedActionsFor(type);
        if (supported.length > 0 && !supported.includes(action)) {
          return { content: [{ type: 'text', text: `Action "${action}" is not supported for ${type}. Supported: ${supported.join(', ')}` }] };
        }
        await requireClient().action(entity, id, action, parameters);
        return { content: [{ type: 'text', text: `Action "${action}" executed successfully on ${type} ${id}.` }] };
      }

      case 'acumatica_report': {
        const { reportId, parameters } = args as unknown as ReportParams;
        const records = await runReport(requireClient(), reportId, parameters);
        return { content: [{ type: 'text', text: JSON.stringify(records, null, 2) }] };
      }

      case 'acumatica_query_summary': {
        const { type, filter, top, select } = args as unknown as QuerySummaryParams;
        const entity = resolveEntity(type);
        const records = await querySummary(requireClient(), entity, filter, top, select);
        return { content: [{ type: 'text', text: JSON.stringify(records, null, 2) }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
});

// --- Start server ---
const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: Build to verify no TypeScript errors**

Run: `cd mcp-server && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mcp-server/src/index.ts
git commit -m "feat: add MCP server entry point with all 10 tools"
```

---

## Task 10: Skills

**Files:**
- Create: `skills/acumatica-setup.md`
- Create: `skills/acumatica-finance.md`
- Create: `skills/acumatica-inventory.md`
- Create: `skills/acumatica-crm.md`
- Create: `skills/acumatica-reports.md`

- [ ] **Step 1: Create skills/acumatica-setup.md**

```markdown
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
```

- [ ] **Step 2: Create skills/acumatica-finance.md**

```markdown
---
name: acumatica-finance
description: Help business users read, create, update, and act on Finance records in Acumatica — invoices, bills, payments, journal entries, and cash accounts.
triggers:
  - invoice, bill, payment, journal entry, cash account, AR, AP, GL
  - "how much do we owe", "unpaid invoices", "release invoice", "post payment"
---

# Acumatica Finance

You assist business users with Acumatica Finance operations. Always format currency values with commas and 2 decimal places. Present lists as markdown tables.

## Record Types
| User says | type parameter |
|-----------|---------------|
| invoice / AR invoice | `Invoice` |
| bill / vendor bill / AP bill | `Bill` |
| payment / customer payment | `Payment` |
| journal entry / GL entry | `JournalEntry` |
| cash account | `CashAccount` |

## Common Queries

**List open invoices over $10,000:**
```
acumatica_list(type="Invoice", filter="Status eq 'Open' and Amount gt 10000", select=["ReferenceNbr","CustomerID","Amount","DueDate"])
```

**Get a specific invoice:**
```
acumatica_get(type="Invoice", id="INV000123")
```

**List overdue bills:**
```
acumatica_list(type="Bill", filter="Status eq 'Open' and DueDate lt '2026-04-02'")
```

## Write Safety

Before calling `acumatica_create`, `acumatica_update`, or `acumatica_action`, always state:
> "I'm about to [action description]. Should I proceed?"

Wait for explicit confirmation before proceeding.

## Common Actions
| Intent | Call |
|--------|------|
| Release an invoice | `acumatica_action(type="Invoice", id="{id}", action="Release")` |
| Void an invoice | `acumatica_action(type="Invoice", id="{id}", action="Void")` |
| Release a bill | `acumatica_action(type="Bill", id="{id}", action="Release")` |
| Release a payment | `acumatica_action(type="Payment", id="{id}", action="Release")` |

## Creating a New Invoice
Required fields: `CustomerID`, `Date`, `Details` (line items with `InventoryID`, `Quantity`, `UnitPrice`).
```

- [ ] **Step 3: Create skills/acumatica-inventory.md**

```markdown
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
```

- [ ] **Step 4: Create skills/acumatica-crm.md**

```markdown
---
name: acumatica-crm
description: Help business users manage CRM records in Acumatica — customers, leads, opportunities, and contacts.
triggers:
  - customer, lead, opportunity, contact, CRM
  - "new lead", "open opportunities", "convert lead", "top customers"
---

# Acumatica CRM

You assist business users with Acumatica CRM operations.

## Record Types
| User says | type parameter |
|-----------|---------------|
| customer | `Customer` |
| lead | `Lead` |
| opportunity | `Opportunity` |
| contact | `Contact` |

## Common Queries

**Open opportunities over $50,000:**
```
acumatica_list(type="Opportunity", filter="Status eq 'Open' and Amount gt 50000", select=["OpportunityID","Subject","Amount","CloseDate","OwnerID"])
```

**Find a customer by name:**
```
acumatica_list(type="Customer", filter="contains(CustomerName,'Acme')")
```

**List new leads this month:**
```
acumatica_list(type="Lead", filter="CreatedDateTime ge '2026-04-01'")
```

## Write Safety

Before calling `acumatica_create`, `acumatica_update`, or `acumatica_action`, always state:
> "I'm about to [action description]. Should I proceed?"

Wait for explicit confirmation before proceeding.

## Creating a Lead
Required fields: `FirstName`, `LastName`, `Email`. Optional: `CompanyName`, `Phone`, `Source`.

## Common Actions
| Intent | Call |
|--------|------|
| Convert lead to opportunity | `acumatica_action(type="Lead", id="{id}", action="ConvertToOpportunity")` |
| Convert lead to contact | `acumatica_action(type="Lead", id="{id}", action="ConvertToContact")` |
| Close/win an opportunity | `acumatica_action(type="Opportunity", id="{id}", action="Win")` |
| Mark opportunity lost | `acumatica_action(type="Opportunity", id="{id}", action="Lose")` |
```

- [ ] **Step 5: Create skills/acumatica-reports.md**

```markdown
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
```

- [ ] **Step 6: Commit**

```bash
git add skills/
git commit -m "feat: add 5 Acumatica skills (setup, finance, inventory, crm, reports)"
```

---

## Task 11: Plugin Manifest

**Files:**
- Create: `plugin.json`

- [ ] **Step 1: Create plugin.json**

```json
{
  "name": "acumatica",
  "version": "1.0.0",
  "description": "Claude Code plugin for Acumatica ERP — read, write, update, and report on Finance, Inventory, and CRM data using natural language.",
  "mcp_servers": [
    {
      "name": "acumatica",
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "description": "Acumatica ERP MCP server"
    }
  ],
  "skills": [
    "skills/acumatica-setup.md",
    "skills/acumatica-finance.md",
    "skills/acumatica-inventory.md",
    "skills/acumatica-crm.md",
    "skills/acumatica-reports.md"
  ]
}
```

- [ ] **Step 2: Build the MCP server**

Run: `cd mcp-server && npm run build`

Expected: `dist/` directory created with compiled JS files, no errors.

- [ ] **Step 3: Verify server starts**

Run: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node mcp-server/dist/index.js`

Expected: JSON response listing all 10 tools.

- [ ] **Step 4: Commit**

```bash
git add plugin.json
git commit -m "feat: add plugin.json manifest — plugin ready for installation"
```

---

## Task 12: Run Full Test Suite

- [ ] **Step 1: Run all tests**

Run: `cd mcp-server && npm test`

Expected: All tests pass. No failures.

- [ ] **Step 2: Fix any failures**

If tests fail, read the error output, fix the issue, and re-run until all pass.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify full test suite passes"
```

---

## Self-Review Notes

- All 10 MCP tools defined in spec are implemented in Task 9.
- All 5 skills defined in spec are implemented in Task 10.
- Both auth methods (basic + OAuth) covered in Tasks 4–5 and wired in Task 9.
- Error handling table from spec (401, 403, 422, 5xx, no config, timeout) all covered in `client.ts` Task 6.
- Write safety (confirm before create/update/action) covered in all 3 domain skills.
- Pagination with `hasMore` flag covered in `client.ts` and referenced in reports skill.
- File permissions (chmod 600 / icacls) covered in `config.ts` Task 3.
- OAuth browser redirect + local callback server covered in `auth/oauth.ts` Task 5.
- Out-of-scope items (web UI, webhooks, multi-tenant switching) not implemented — correct.
