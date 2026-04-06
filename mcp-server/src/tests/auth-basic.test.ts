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
