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
 * API (mirrors the helper in todo.spec.ts).
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
 * Type a task text into the task input and press ADD.
 * Hides the keyboard afterwards so subsequent taps land correctly.
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

describe('Weekend tasks — 5-task full completion flow', () => {
  it('creates a list named "weekend tasks", adds 5 tasks, marks all completed, and verifies 5/5 on the list screen', async () => {
    // ── Step 1: Create the "weekend tasks" list ───────────────────────────
    await (await $('~list-name-input')).setValue(LIST_NAME);
    await (await $('~create-list-button')).click();
    if (await browser.isKeyboardShown()) {
      await browser.hideKeyboard();
    }

    // ── Step 2: Open the list detail screen ──────────────────────────────
    // The row's accessibilityLabel is "<name> <done>/<total>", initially 0/0.
    await (
      await $(`-ios predicate string:label == "${LIST_NAME} 0/0"`)
    ).click();

    // Confirm we are on the detail screen.
    await expect(await $('~task-counter')).toBeDisplayed();
    await expect(await counterText()).toBe('0/0 completed');

    // ── Step 3: Add 5 tasks ───────────────────────────────────────────────
    for (const task of TASKS) {
      await addTask(task);
    }

    await expect(await counterText()).toBe('0/5 completed');

    // ── Step 4: Mark all 5 tasks as completed ────────────────────────────
    // Tasks render with testID `task-row-<id>` where <id> is a UUID.
    // We locate them all via the task-list container and tap each one.
    const taskList = await $('~task-list');
    await taskList.waitForDisplayed();

    for (const task of TASKS) {
      // Each task row's accessibility label is its text; tap it to toggle done.
      await tap(`~${task}`);
    }

    // All 5 should now be completed.
    await expect(await counterText()).toBe('5/5 completed');

    // ── Step 5: Go back to the list management screen ────────────────────
    await tap('~back-button');

    // ── Step 6: Verify the "weekend tasks" row shows 5/5 ─────────────────
    // After all 5 tasks are done the accessibilityLabel becomes "<name> 5/5".
    const listRow = await $(`-ios predicate string:label == "${LIST_NAME} 5/5"`);
    await listRow.waitForDisplayed();
    await expect(listRow).toBeDisplayed();
  });
});
