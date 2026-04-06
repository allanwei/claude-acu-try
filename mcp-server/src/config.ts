import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import type { AcumaticaConfig } from './types.js';

export const CONFIG_PATH: string =
  process.env.ACUMATICA_CONFIG_PATH ??
  path.join(os.homedir(), '.acumatica-plugin.json');

export function loadConfig(): AcumaticaConfig | null {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as AcumaticaConfig;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err; // Re-throw parse errors and permission errors
  }
}

export function saveConfig(config: AcumaticaConfig): void {
  const json = JSON.stringify(config, null, 2);
  const tmpPath = CONFIG_PATH + '.tmp';

  // Write to temp file, atomically rename into place, then secure it
  fs.writeFileSync(tmpPath, json, { encoding: 'utf-8' });

  // On Windows, we may need to remove the existing file first due to permission restrictions
  if (process.platform === 'win32' && fs.existsSync(CONFIG_PATH)) {
    try {
      fs.unlinkSync(CONFIG_PATH);
    } catch {
      // If we can't remove it, chmod and try again
      try {
        const username = os.userInfo().username;
        execSync(
          `icacls "${CONFIG_PATH}" /inheritance:e /grant:r "${username}:(F)"`,
          { stdio: 'ignore' }
        );
        fs.unlinkSync(CONFIG_PATH);
      } catch {
        // Ignore and let renameSync try
      }
    }
  }

  fs.renameSync(tmpPath, CONFIG_PATH);
  setRestrictedPermissions(CONFIG_PATH);
}

function setRestrictedPermissions(filePath: string): void {
  if (process.platform === 'win32') {
    try {
      const username = os.userInfo().username;
      execSync(
        `icacls "${filePath}" /inheritance:r /grant:r "${username}:(R,W)"`,
        { stdio: 'ignore' }
      );
    } catch {
      // Best-effort on Windows
    }
  } else {
    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      // Best-effort
    }
  }
}
