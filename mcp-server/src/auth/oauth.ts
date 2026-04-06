import axios from 'axios';
import * as http from 'http';
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
      const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

      const server = http.createServer((req, res) => {
        const parsed = new URL(req.url ?? '/', `http://localhost:${REDIRECT_PORT}`);
        if (parsed.pathname !== '/callback') {
          res.writeHead(404);
          res.end();
          return;
        }

        const code = parsed.searchParams.get('code');
        const returnedState = parsed.searchParams.get('state');
        const error = parsed.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h1>Authorization failed: ${error}. You may close this tab.</h1>`);
          server.close();
          clearTimeout(timer);
          return reject(new Error(`OAuth error: ${error}`));
        }
        if (returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization failed: state mismatch. You may close this tab.</h1>');
          server.close();
          clearTimeout(timer);
          return reject(new Error('OAuth state mismatch'));
        }
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization failed: no code returned. You may close this tab.</h1>');
          server.close();
          clearTimeout(timer);
          return reject(new Error('No code returned'));
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization complete. You may close this tab.</h1>');
        server.close();
        clearTimeout(timer);
        resolve(code);
      });

      const timer = setTimeout(() => {
        server.close();
        reject(new Error('OAuth authorization timed out after 5 minutes.'));
      }, TIMEOUT_MS);

      server.listen(REDIRECT_PORT, () => open(authUrl));
      server.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
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
    if (data.error) {
      throw new Error(`Token endpoint error: ${data.error}${data.error_description ? ` — ${data.error_description}` : ''}`);
    }
    const expiresIn = (data.expires_in as number) ?? 3600;
    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string,
      expiresAt: Date.now() + expiresIn * 1000,
    };
  }
}
