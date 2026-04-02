import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import type { AcumaticaConfig } from './types.js';

export const CONFIG_PATH: string =
  process.env.ACUMATICA_CONFIG_PATH ??
  path.join(os.homedir(), '.acumatica-plugin.json');

export function loadConfig(): AcumaticaConfig | null {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as AcumaticaConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: AcumaticaConfig): void {
  const json = JSON.stringify(config, null, 2);
  fs.writeFileSync(CONFIG_PATH, json, { encoding: 'utf-8' });
  setRestrictedPermissions(CONFIG_PATH);
}

function setRestrictedPermissions(filePath: string): void {
  if (process.platform === 'win32') {
    try {
      execSync(
        `icacls "${filePath}" /inheritance:r /grant:r "%USERNAME%:(R,W)"`,
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
