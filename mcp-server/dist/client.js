import axios from 'axios';
const API_VERSION = '23.200.001';
export class AcumaticaClient {
    instanceUrl;
    company;
    _cookie = null;
    _oauthToken = null;
    http;
    constructor(instanceUrl, company) {
        this.instanceUrl = instanceUrl;
        this.company = company;
        this.http = axios.create({
            baseURL: `${instanceUrl}/${company}/entity/Default/${API_VERSION}`,
            timeout: 30_000,
        });
    }
    setBasicAuth(cookie) {
        this._cookie = cookie;
        this._oauthToken = null;
    }
    setOAuthToken(token) {
        this._oauthToken = token;
        this._cookie = null;
    }
    authHeaders() {
        if (this._cookie)
            return { Cookie: this._cookie };
        if (this._oauthToken)
            return { Authorization: `Bearer ${this._oauthToken}` };
        return {};
    }
    async get(type, id) {
        const resp = await this.http.get(`/${type}/${id}`, {
            headers: this.authHeaders(),
            validateStatus: () => true,
        });
        this.throwOnError(resp.status, resp.data, `${type} ${id} not found`);
        return resp.data;
    }
    async list(type, params = {}) {
        const top = params.top ?? 50;
        const query = { $top: String(top) };
        if (params.filter)
            query['$filter'] = params.filter;
        if (params.select?.length)
            query['$select'] = params.select.join(',');
        if (params.expand?.length)
            query['$expand'] = params.expand.join(',');
        const resp = await this.http.get(`/${type}`, {
            params: query,
            headers: this.authHeaders(),
            validateStatus: () => true,
        });
        this.throwOnError(resp.status, resp.data);
        const records = resp.data;
        return { records, hasMore: records.length >= top };
    }
    async create(type, data) {
        const resp = await this.http.put(`/${type}`, data, {
            headers: this.authHeaders(),
            validateStatus: () => true,
        });
        this.throwOnError(resp.status, resp.data);
        return resp.data;
    }
    async update(type, id, data) {
        const resp = await this.http.put(`/${type}/${id}`, data, {
            headers: this.authHeaders(),
            validateStatus: () => true,
        });
        this.throwOnError(resp.status, resp.data);
        return resp.data;
    }
    async action(type, id, actionName, parameters) {
        const body = parameters ? { entity: parameters } : {};
        const resp = await this.http.post(`/${type}/${id}/${actionName}`, body, {
            headers: this.authHeaders(),
            validateStatus: () => true,
        });
        this.throwOnError(resp.status, resp.data);
    }
    throwOnError(status, data, notFoundMsg) {
        if (status >= 200 && status < 300)
            return;
        const msg = data?.message ?? '';
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
