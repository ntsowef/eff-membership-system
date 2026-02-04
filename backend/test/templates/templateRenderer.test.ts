import assert from 'assert';
import { renderTemplateString } from '../../src/utils/templateRenderer';

function run() {
  // 1) Double-curly placeholders as reported by user
  const tpl1 = 'Welcome {{firstname}} {{surname}}! Your EFF membership {{membership_number}} is now active.';
  const out1 = renderTemplateString(tpl1, {
    first_name: 'John',
    last_name: 'Doe',
    membership_number: 'M000123'
  });
  assert.strictEqual(out1, 'Welcome John Doe! Your EFF membership M000123 is now active.');

  // 2) Single-curly placeholders (existing code paths)
  const tpl2 = 'Hi {firstName} {lastName}, membership {membership_number}.';
  const out2 = renderTemplateString(tpl2, {
    firstName: 'John',
    lastName: 'Doe',
    membership_number: 'M000123'
  });
  assert.strictEqual(out2, 'Hi John Doe, membership M000123.');

  // 3) Key normalization (case + underscores)
  const tpl3 = 'Welcome {{FIRST_NAME}} {{LAST_NAME}}';
  const out3 = renderTemplateString(tpl3, { first_name: 'John', last_name: 'Doe' });
  assert.strictEqual(out3, 'Welcome John Doe');

  console.log('[OK] templateRenderer personalization tests passed');
}

run();
