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
