import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCompanyId, toActiveCompany } from './companyProfile.js';

test('resolveCompanyId accepts either companyId or id from the company payload', () => {
  assert.equal(resolveCompanyId({ companyId: 42 }), '42');
  assert.equal(resolveCompanyId({ id: 99 }), '99');
  assert.equal(resolveCompanyId({}), null);
});

test('toActiveCompany normalizes alternate company payloads', () => {
  assert.deepEqual(toActiveCompany({ id: 14, companyName: 'Acme', accessRole: 'OWNER' }), {
    companyId: '14',
    companyName: 'Acme',
    cin: '',
    pan: '',
    accessRole: 'OWNER',
  });
});
