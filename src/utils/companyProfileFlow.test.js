import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldShowCompanyProfileSetup } from './companyProfileFlow.js';

test('shows company profile screen after successful registration', () => {
  assert.equal(
    shouldShowCompanyProfileSetup({
      user: { userId: 'u1' },
      companyProfileSetupOpen: false,
      landingView: 'profile',
    }),
    true
  );
});

test('does not show company profile screen when user is not signed in', () => {
  assert.equal(
    shouldShowCompanyProfileSetup({
      user: null,
      companyProfileSetupOpen: true,
      landingView: 'profile',
    }),
    false
  );
});
