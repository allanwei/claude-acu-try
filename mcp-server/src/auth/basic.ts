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
