const LIST_NAME = 'weekend tasks';
const TASKS = [
  'Buy groceries',
  'Clean the house',
  'Do the laundry',
  'Mow the lawn',
  'Call the plumber',
];

/**
 * Press the element matching `selector` for `durationMs` using the W3C actions
 * API. Mirrors the helper used in todo.spec.ts — React Native Pressable on iOS
 * requires real pointer events rather than a native .click() to fire reliably.
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
 * Type `text` into the task input and press ADD.
 * Hides the software keyboard afterwards so subsequent taps land correctly.
 */
async function addTask(text: string) {
  await (await $('~task-input')).setValue(text);
  await (await $('~add-task-button')).click();
  if (await browser.isKeyboardShown()) {
    await browser.hideKeyboard();
  }
}

/** Returns the current text of the task-counter element. */
async function counterText(): Promise<string> {
  const counter = await $('~task-counter');
  await counter.waitForDisplayed();
  return counter.getText();
}

describe('Weekend tasks — create list, add 5 tasks, complete all, verify 5/5', () => {
  it('creates "weekend tasks", adds 5 tasks, marks all completed, and verifies 5/5 on the list screen', async () => {

    // ── Step 1: Create the "weekend tasks" list ───────────────────────────
    await (await $('~list-name-input')).setValue(LIST_NAME);
    await (await $('~create-list-button')).click();
    if (await browser.isKeyboardShown()) {
      await browser.hideKeyboard();
    }

    // ── Step 2: Open the list detail screen ──────────────────────────────
    // The row's accessibilityLabel is "<name> <done>/<total>"; a fresh list starts at 0/0.
    const listRow0 = await $(`-ios predicate string:label == "${LIST_NAME} 0/0"`);
    await listRow0.waitForDisplayed();
    await listRow0.click();

    // Confirm we landed on the detail screen.
    await expect(await $('~task-counter')).toBeDisplayed();
    await expect(await counterText()).toBe('0/0 completed');

    // ── Step 3: Add 5 tasks ───────────────────────────────────────────────
    for (const task of TASKS) {
      await addTask(task);
    }

    await expect(await counterText()).toBe('0/5 completed');

    // ── Step 4: Mark all 5 tasks as completed ────────────────────────────
    // Each task's Pressable uses the task text as its accessibility label via
    // the ~<text> selector (consistent with todo.spec.ts usage of `~${TASK}`).
    for (const task of TASKS) {
      await tap(`~${task}`);
    }

    await expect(await counterText()).toBe('5/5 completed');

    // ── Step 5: Navigate back to the list management screen ──────────────
    await tap('~back-button');

    // ── Step 6: Verify "weekend tasks" shows 5/5 ─────────────────────────
    // The row's accessibilityLabel is now "<name> 5/5".
    const listRow5 = await $(`-ios predicate string:label == "${LIST_NAME} 5/5"`);
    await listRow5.waitForDisplayed();
    await expect(listRow5).toBeDisplayed();
  });
});
