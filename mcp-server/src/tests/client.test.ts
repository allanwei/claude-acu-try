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
  it('returns records and hasMore=false when count < top', async () => {
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

  it('throws SESSION_EXPIRED with code on 401', async () => {
    nock(BASE).get(`${API}/Invoice/X`).reply(401);
    const client = makeClient();
    let err: Error & { code?: string } | null = null;
    try {
      await client.get('Invoice', 'X');
    } catch (e) {
      err = e as Error & { code?: string };
    }
    expect(err).not.toBeNull();
    expect(err?.message).toMatch(/Session expired/);
    expect(err?.code).toBe('SESSION_EXPIRED');
  });

  it('throws server error on 500', async () => {
    nock(BASE).get(`${API}/Invoice/X`).reply(500);
    const client = makeClient();
    await expect(client.get('Invoice', 'X')).rejects.toThrow('Acumatica server error (500)');
  });
});

describe('AcumaticaClient.action', () => {
  it('posts to action endpoint', async () => {
    nock(BASE).post(`${API}/Invoice/INV001/Release`).reply(204);
    const client = makeClient();
    await expect(client.action('Invoice', 'INV001', 'Release')).resolves.toBeUndefined();
  });
});

describe('AcumaticaClient auth headers', () => {
  it('sends Bearer token when set via setOAuthToken', async () => {
    nock(BASE)
      .get(`${API}/Invoice/INV001`)
      .matchHeader('authorization', 'Bearer mytoken123')
      .reply(200, { ReferenceNbr: 'INV001' });

    const client = new AcumaticaClient(BASE, COMPANY);
    client.setOAuthToken('mytoken123');
    const result = await client.get('Invoice', 'INV001');
    expect(result).toEqual({ ReferenceNbr: 'INV001' });
  });

  it('sends Cookie header when set via setBasicAuth', async () => {
    nock(BASE)
      .get(`${API}/Invoice/INV001`)
      .matchHeader('cookie', 'ASP.NET_SessionId=xyz')
      .reply(200, { ReferenceNbr: 'INV001' });

    const client = new AcumaticaClient(BASE, COMPANY);
    client.setBasicAuth('ASP.NET_SessionId=xyz');
    const result = await client.get('Invoice', 'INV001');
    expect(result).toEqual({ ReferenceNbr: 'INV001' });
  });
});
