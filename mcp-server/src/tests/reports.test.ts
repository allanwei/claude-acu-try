import { describe, it, expect } from '@jest/globals';
import { resolveReportEntity, REPORT_MAP } from '../reports.js';

describe('resolveReportEntity', () => {
  it('maps AR631000 to AgedReceivable', () => {
    expect(resolveReportEntity('AR631000')).toBe('AgedReceivable');
  });

  it('maps AP631000 to AgedPayable', () => {
    expect(resolveReportEntity('AP631000')).toBe('AgedPayable');
  });

  it('throws for unknown report ID', () => {
    expect(() => resolveReportEntity('XX999999')).toThrow('Unknown report ID');
  });
});

describe('REPORT_MAP', () => {
  it('contains all 4 expected reports', () => {
    expect(Object.keys(REPORT_MAP)).toHaveLength(4);
  });
});
