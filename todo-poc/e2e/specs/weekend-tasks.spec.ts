const WEEKEND_LIST_NAME = 'weekend tasks';
const WEEKEND_TASKS = [
  'Buy groceries',
  'Clean the house',
  'Do laundry',
  'Cook dinner',
  'Watch a movie',
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

describe('Weekend Tasks – create list, add 5 tasks, complete all, verify progress', () => {
  it('creates "weekend tasks" list, adds 5 tasks, marks all completed, and shows 5/5 on the list screen', async () => {
    // ── Step 1: Create the list ────────────────────────────────────────────
    await (await $('~list-name-input')).setValue(WEEKEND_LIST_NAME);
    await (await $('~create-list-button')).click();
    if (await browser.isKeyboardShown()) {
      await browser.hideKeyboard();
    }

    // Verify the new list row appears with 0/0 progress
    const listRow = await $(`-ios predicate string:label == "${WEEKEND_LIST_NAME} 0/0"`);
    await listRow.waitForDisplayed({ timeout: 5000 });

    // ── Step 2: Enter the list detail and add 5 tasks ─────────────────────
    await listRow.click();

    await expect(await counterText()).toBe('0/0 completed');

    for (const task of WEEKEND_TASKS) {
      await addTask(task);
    }

    await expect(await counterText()).toBe('0/5 completed');

    // Verify all 5 task labels are visible
    for (const task of WEEKEND_TASKS) {
      await expect(
        await $(`-ios predicate string:label == "${task}"`)
      ).toBeDisplayed();
    }

    // ── Step 3: Mark all 5 tasks as completed ─────────────────────────────
    for (const task of WEEKEND_TASKS) {
      await tap(`-ios predicate string:label == "${task}"`);
    }

    await expect(await counterText()).toBe('5/5 completed');

    // ── Step 4: Go back and verify 5/5 progress on the list row ───────────
    await (await $('~back-button')).click();

    const completedListRow = await $(
      `-ios predicate string:label == "${WEEKEND_LIST_NAME} 5/5"`
    );
    await completedListRow.waitForDisplayed({ timeout: 5000 });
    await expect(completedListRow).toBeDisplayed();
  });
});
