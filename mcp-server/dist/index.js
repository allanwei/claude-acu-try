// mcp-server/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig, saveConfig } from './config.js';
import { BasicAuthSession } from './auth/basic.js';
import { OAuthSession } from './auth/oauth.js';
import { AcumaticaClient } from './client.js';
import { resolveEntity, supportedActionsFor } from './modules/index.js';
import { runReport, querySummary } from './reports.js';
// --- Session state (in-memory) ---
let client = null;
let basicSession = null;
let oauthSession = null;
function requireClient() {
    if (!client) {
        throw new Error('Not connected to Acumatica. Ask Claude to set up your connection first.');
    }
    return client;
}
// --- MCP Server setup ---
const server = new Server({ name: 'acumatica-mcp-server', version: '1.0.0' }, { capabilities: { tools: {} } });
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
                    filter: { type: 'string', description: "OData $filter expression, e.g. Status eq 'Open'" },
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
                const p = args;
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
                if (!config)
                    return { content: [{ type: 'text', text: 'No configuration found. Please run acumatica_configure first.' }] };
                client = new AcumaticaClient(config.instanceUrl, config.company);
                if (config.authMethod === 'basic') {
                    if (!config.username || !config.password)
                        throw new Error('Username and password required for basic auth.');
                    basicSession = new BasicAuthSession(config.instanceUrl, config.company);
                    await basicSession.login(config.username, config.password);
                    client.setBasicAuth(basicSession.getCookie());
                }
                else {
                    if (!config.clientId || !config.clientSecret)
                        throw new Error('clientId and clientSecret required for OAuth.');
                    oauthSession = new OAuthSession(config.instanceUrl);
                    const token = config.oauthTokens
                        ? await oauthSession.getValidToken(config.clientId, config.clientSecret)
                        : await (async () => {
                            const tokens = await oauthSession.authorize(config.clientId, config.clientSecret);
                            saveConfig({ ...config, oauthTokens: tokens });
                            return tokens.accessToken;
                        })();
                    client.setOAuthToken(token);
                }
                return { content: [{ type: 'text', text: `Connected to Acumatica (${config.instanceUrl}, company: ${config.company}).` }] };
            }
            case 'acumatica_disconnect': {
                if (basicSession)
                    await basicSession.logout();
                client = null;
                basicSession = null;
                oauthSession = null;
                return { content: [{ type: 'text', text: 'Disconnected from Acumatica.' }] };
            }
            case 'acumatica_get': {
                const { type, id } = args;
                const entity = resolveEntity(type);
                const record = await requireClient().get(entity, id);
                return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] };
            }
            case 'acumatica_list': {
                const { type, filter, top, select } = args;
                const entity = resolveEntity(type);
                const result = await requireClient().list(entity, { filter, top, select });
                const summary = result.hasMore ? `\n\n(Showing first ${top ?? 50} records. There may be more.)` : '';
                return { content: [{ type: 'text', text: JSON.stringify(result.records, null, 2) + summary }] };
            }
            case 'acumatica_create': {
                const { type, data } = args;
                const entity = resolveEntity(type);
                const record = await requireClient().create(entity, data);
                return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] };
            }
            case 'acumatica_update': {
                const { type, id, data } = args;
                const entity = resolveEntity(type);
                const record = await requireClient().update(entity, id, data);
                return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] };
            }
            case 'acumatica_action': {
                const { type, id, action, parameters } = args;
                const entity = resolveEntity(type);
                const supported = supportedActionsFor(type);
                if (supported.length > 0 && !supported.includes(action)) {
                    return { content: [{ type: 'text', text: `Action "${action}" is not supported for ${type}. Supported: ${supported.join(', ')}` }] };
                }
                await requireClient().action(entity, id, action, parameters);
                return { content: [{ type: 'text', text: `Action "${action}" executed successfully on ${type} ${id}.` }] };
            }
            case 'acumatica_report': {
                const { reportId, parameters } = args;
                const records = await runReport(requireClient(), reportId, parameters);
                return { content: [{ type: 'text', text: JSON.stringify(records, null, 2) }] };
            }
            case 'acumatica_query_summary': {
                const { type, filter, top, select } = args;
                const entity = resolveEntity(type);
                const records = await querySummary(requireClient(), entity, filter, top, select);
                return { content: [{ type: 'text', text: JSON.stringify(records, null, 2) }] };
            }
            default:
                return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
});
// --- Start server ---
const transport = new StdioServerTransport();
await server.connect(transport);
