/**
 * @fileoverview Tests for wizard feedback module.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createSpinner,
  showStep,
  showValidation,
  showWarning,
  showError,
  showQuickStart,
  showSummary,
  showChecklist,
} from '../../src/wizard/feedback.js';

// ---------------------------------------------------------------------------
// createSpinner
// ---------------------------------------------------------------------------

describe('createSpinner', () => {
  it('returns an object with start and stop methods', () => {
    const spinner = createSpinner('Loading...');
    assert.equal(typeof spinner.start, 'function');
    assert.equal(typeof spinner.stop, 'function');
  });

  it('accepts empty text', () => {
    const spinner = createSpinner('');
    assert.ok(spinner);
  });
});

// ---------------------------------------------------------------------------
// Formatting functions
// ---------------------------------------------------------------------------

describe('showStep', () => {
  it('does not throw with valid message', () => {
    assert.doesNotThrow(() => showStep('Step completed'));
  });

  it('does not throw with empty message', () => {
    assert.doesNotThrow(() => showStep(''));
  });
});

describe('showValidation', () => {
  it('does not throw with valid message', () => {
    assert.doesNotThrow(() => showValidation('Validation passed'));
  });

  it('does not throw with empty message', () => {
    assert.doesNotThrow(() => showValidation(''));
  });
});

describe('showWarning', () => {
  it('does not throw with valid message', () => {
    assert.doesNotThrow(() => showWarning('Warning message'));
  });

  it('does not throw with empty message', () => {
    assert.doesNotThrow(() => showWarning(''));
  });
});

describe('showError', () => {
  it('does not throw with valid message', () => {
    assert.doesNotThrow(() => showError('Error occurred'));
  });

  it('does not throw with empty message', () => {
    assert.doesNotThrow(() => showError(''));
  });
});

// ---------------------------------------------------------------------------
// showQuickStart
// ---------------------------------------------------------------------------

describe('showQuickStart', () => {
  it('does not throw with title and steps', () => {
    assert.doesNotThrow(() => showQuickStart('Quick Start', ['Step 1', 'Step 2', 'Step 3']));
  });

  it('does not throw with empty steps array', () => {
    assert.doesNotThrow(() => showQuickStart('Title', []));
  });
});

// ---------------------------------------------------------------------------
// showSummary
// ---------------------------------------------------------------------------

describe('showSummary', () => {
  it('does not throw with key-value data', () => {
    assert.doesNotThrow(() => showSummary({ Project: 'test', Language: 'en', Type: 'greenfield' }));
  });

  it('does not throw with empty object', () => {
    assert.doesNotThrow(() => showSummary({}));
  });
});

// ---------------------------------------------------------------------------
// showChecklist
// ---------------------------------------------------------------------------

describe('showChecklist', () => {
  it('does not throw with items array', () => {
    assert.doesNotThrow(() => showChecklist(['13 agents', '6 workflows', 'Constitution']));
  });

  it('does not throw with empty array', () => {
    assert.doesNotThrow(() => showChecklist([]));
  });
});
