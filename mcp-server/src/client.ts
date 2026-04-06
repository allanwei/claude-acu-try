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
