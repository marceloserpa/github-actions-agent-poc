const LIST_NAME = 'weekend tasks';

const TASKS = [
  'Buy groceries',
  'Clean the house',
  'Do laundry',
  'Mow the lawn',
  'Cook dinner',
];

/**
 * Press the element matching `selector` for `durationMs` using the W3C actions
 * API. Mirrors the same helper used in todo.spec.ts.
 */
async function press(selector: string, durationMs: number) {
  const element = await $(selector).getElement();
  await browser
    .action('pointer', { parameters: { pointerType: 'touch' } })
    .move({ origin: element })
    .down()
    .pause(durationMs)
    .up()
    .perform(true);
}

const tap = (selector: string) => press(selector, 300);

/**
 * Type a task and press ADD. Dismisses the keyboard afterwards so subsequent
 * taps land correctly.
 */
async function addTask(text: string) {
  await (await $('~task-input')).setValue(text);
  await (await $('~add-task-button')).click();
  if (await browser.isKeyboardShown()) {
    await browser.hideKeyboard();
  }
}

async function counterText() {
  const counter = await $('~task-counter');
  await counter.waitForDisplayed();
  return counter.getText();
}

describe('Weekend Tasks — full flow', () => {
  it('creates a list, adds 5 tasks, marks all completed, and shows 5/5 on the list screen', async () => {
    // ── Step 1: Create the "weekend tasks" list ──────────────────────────────
    await (await $('~list-name-input')).setValue(LIST_NAME);
    await (await $('~create-list-button')).click();
    if (await browser.isKeyboardShown()) {
      await browser.hideKeyboard();
    }

    // ── Step 2: Open the list and add 5 tasks ───────────────────────────────
    await (
      await $(`-ios predicate string:label == "${LIST_NAME} 0/0"`)
    ).click();

    // Confirm we are on the detail screen (counter visible and at 0/0).
    await expect(await counterText()).toBe('0/0 completed');

    for (const task of TASKS) {
      await addTask(task);
    }

    await expect(await counterText()).toBe('0/5 completed');

    // ── Step 3: Mark all 5 tasks as completed ───────────────────────────────
    // Tasks are rendered with testID `task-text-<uuid>` and display text that
    // matches the accessibility label, so we locate each by its visible text.
    for (const task of TASKS) {
      await tap(`-ios predicate string:label == "${task}"`);
    }

    await expect(await counterText()).toBe('5/5 completed');

    // ── Step 4: Go back and verify the list row shows "weekend tasks 5/5" ───
    await (await $('~back-button')).click();

    // The list-row accessibilityLabel is built as `${name} ${done}/${total}`.
    const listRow = await $(`-ios predicate string:label == "${LIST_NAME} 5/5"`);
    await listRow.waitForDisplayed({ timeout: 5000 });
    await expect(listRow).toBeDisplayed();
  });
});
