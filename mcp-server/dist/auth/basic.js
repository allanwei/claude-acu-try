import axios from 'axios';
export class BasicAuthSession {
    instanceUrl;
    company;
    _cookie = null;
    constructor(instanceUrl, company) {
        this.instanceUrl = instanceUrl;
        this.company = company;
    }
    get isLoggedIn() {
        return this._cookie !== null;
    }
    getCookie() {
        return this._cookie;
    }
    async login(username, password) {
        const url = `${this.instanceUrl}/${this.company}/entity/auth/login`;
        const resp = await axios.post(url, { name: username, password, company: this.company }, { validateStatus: () => true });
        if (resp.status === 401 || resp.status === 403) {
            const msg = resp.data?.message ?? 'Invalid credentials';
            throw new Error(msg);
        }
        if (resp.status >= 400) {
            throw new Error(`Login failed with status ${resp.status}`);
        }
        const setCookie = resp.headers['set-cookie'];
        if (!setCookie || setCookie.length === 0) {
            throw new Error('Login succeeded but no session cookie was returned.');
        }
        this._cookie = setCookie[0].split(';')[0];
    }
    async logout() {
        if (!this._cookie)
            return;
        const url = `${this.instanceUrl}/${this.company}/entity/auth/logout`;
        try {
            await axios.post(url, {}, {
                headers: { Cookie: this._cookie },
                validateStatus: () => true,
            });
        }
        finally {
            this._cookie = null;
        }
    }
}
