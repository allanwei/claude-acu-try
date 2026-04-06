import type { AcumaticaClient } from './client.js';
import type { AcumaticaRecord } from './types.js';

/** Maps Acumatica report IDs to their equivalent inquiry entity names in the Default endpoint */
export const REPORT_MAP: Record<string, string> = {
  AR631000: 'AgedReceivable',
  AP631000: 'AgedPayable',
  GL632000: 'TrialBalance',
  AR641000: 'CustomerStatement',
};

export function resolveReportEntity(reportId: string): string {
  const entity = REPORT_MAP[reportId];
  if (!entity) {
    const known = Object.keys(REPORT_MAP).join(', ');
    throw new Error(`Unknown report ID "${reportId}". Known reports: ${known}`);
  }
  return entity;
}

/**
 * Run a named report by its Acumatica report ID.
 * Maps the report ID to the corresponding inquiry entity and fetches records.
 * Note: only `parameters.filter` (OData $filter string) is currently used; other keys are ignored.
 */
export async function runReport(
  client: AcumaticaClient,
  reportId: string,
  parameters?: Record<string, unknown>
): Promise<AcumaticaRecord[]> {
  const entity = resolveReportEntity(reportId);
  const filter = parameters?.filter as string | undefined;
  const result = await client.list(entity, { filter, top: 200 });
  return result.records;
}

/**
 * Query records for natural-language summarization.
 * Returns up to `top` records with optional filter and field selection.
 */
export async function querySummary(
  client: AcumaticaClient,
  type: string,
  filter?: string,
  top = 50,
  select?: string[]
): Promise<AcumaticaRecord[]> {
  const result = await client.list(type, { filter, top, select });
  return result.records;
}
