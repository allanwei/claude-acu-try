import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Override config path for tests BEFORE importing the module
const testConfigPath = path.join(os.tmpdir(), '.acumatica-test.json');
process.env.ACUMATICA_CONFIG_PATH = testConfigPath;

import { loadConfig, saveConfig, CONFIG_PATH } from '../config.js';
import type { AcumaticaConfig } from '../types.js';

// Ensure clean state before all tests
beforeEach(() => {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      if (process.platform === 'win32') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { execSync } = require('child_process');
        try {
          execSync(`icacls "${CONFIG_PATH}" /inheritance:e /grant:r "*S-1-1-0:(F)"`, {
            stdio: 'ignore',
          });
        } catch {
          // Ignore
        }
      }
      fs.unlinkSync(CONFIG_PATH);
    } catch {
      // Best-effort cleanup
    }
  }
});

const TEST_CONFIG: AcumaticaConfig = {
  instanceUrl: 'https://test.acumatica.com',
  company: 'TestCo',
  authMethod: 'basic',
  username: 'admin',
  password: 'secret',
};

afterEach(() => {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      // On Windows, reset permissions before deleting
      if (process.platform === 'win32') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { execSync } = require('child_process');
        try {
          execSync(`icacls "${CONFIG_PATH}" /inheritance:e /grant:r "*S-1-1-0:(F)"`, {
            stdio: 'ignore',
          });
        } catch {
          // Ignore
        }
      }
      fs.unlinkSync(CONFIG_PATH);
    } catch {
      // Best-effort cleanup
    }
  }
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
