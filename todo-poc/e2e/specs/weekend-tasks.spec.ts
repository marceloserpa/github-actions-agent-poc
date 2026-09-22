/**
 * Spec: Weekend Tasks — full 5-task creation and completion flow
 *
 * Scenario:
 *  1. Create a todo list named "weekend tasks".
 *  2. Enter the list detail screen and add 5 tasks.
 *  3. Mark all 5 tasks as completed.
 *  4. Navigate back to the list management screen and verify
 *     the "weekend tasks" row shows 5/5.
 */

const LIST_NAME = 'weekend tasks';
const TASKS = [
  'Buy groceries',
  'Clean the house',
  'Do the laundry',
  'Mow the lawn',
  'Call the plumber',
];

/**
 * Drive a real touch pointer event on `selector` for `durationMs`.
 * Mirrors the helper in todo.spec.ts — WDA on iOS real devices does not
 * reliably fire React Native Pressable.onPress via native .click(), so we
 * use the W3C actions API instead.  perform(true) skips the unsupported
 * DELETE /actions endpoint on BrowserStack WDA builds.
 */
async function press(selector: string, durationMs: number): Promise<void> {
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
 * Type `text` into the task input, press ADD, then hide the keyboard so
 * subsequent taps land on the intended targets rather than dismissing it.
 */
async function addTask(text: string): Promise<void> {
  await (await $('~task-input')).setValue(text);
  await (await $('~add-task-button')).click();
  if (await browser.isKeyboardShown()) {
    await browser.hideKeyboard();
  }
}

/** Returns the current text of the ~task-counter element. */
async function counterText(): Promise<string> {
  const counter = await $('~task-counter');
  await counter.waitForDisplayed();
  return counter.getText();
}

describe('Weekend tasks — create list, add 5 tasks, mark all complete, verify 5/5', () => {
  it('creates "weekend tasks", adds 5 tasks, marks all completed and verifies 5/5 on the list screen', async () => {

    // ── Step 1: Create the "weekend tasks" list ───────────────────────────
    await (await $('~list-name-input')).setValue(LIST_NAME);
    await (await $('~create-list-button')).click();
    if (await browser.isKeyboardShown()) {
      await browser.hideKeyboard();
    }

    // ── Step 2: Open the list detail screen ──────────────────────────────
    // The list row's accessibilityLabel = "<name> <done>/<total>".
    // A brand-new list starts at 0/0, so we match "weekend tasks 0/0".
    // We use the iOS predicate string strategy (not `~`) because the row's
    // testID is the dynamic UUID, which `~` would resolve instead of the label.
    const listRow = await $(`-ios predicate string:label == "${LIST_NAME} 0/0"`);
    await listRow.waitForDisplayed();
    await listRow.click();

    // Confirm we are on the detail screen.
    await (await $('~task-counter')).waitForDisplayed();
    await expect(await counterText()).toBe('0/0 completed');

    // ── Step 3: Add 5 tasks ───────────────────────────────────────────────
    for (const task of TASKS) {
      await addTask(task);
    }

    // All 5 tasks should now be visible and the counter updated.
    await expect(await counterText()).toBe('0/5 completed');

    for (const task of TASKS) {
      await expect(await $(`~${task}`)).toBeDisplayed();
    }

    // ── Step 4: Mark every task as completed ─────────────────────────────
    // Each task Pressable exposes its text as its accessibility label,
    // matching the `~${TASK}` pattern used in the existing todo.spec.ts.
    for (const task of TASKS) {
      await tap(`~${task}`);
    }

    // Counter must now read 5/5.
    await expect(await counterText()).toBe('5/5 completed');

    // ── Step 5: Go back to the list management screen ────────────────────
    await tap('~back-button');

    // ── Step 6: Verify "weekend tasks" shows 5/5 on the management page ──
    // After navigating back the row's accessibilityLabel becomes
    // "weekend tasks 5/5" (all 5 tasks done out of 5 total).
    const updatedRow = await $(`-ios predicate string:label == "${LIST_NAME} 5/5"`);
    await updatedRow.waitForDisplayed();
    await expect(updatedRow).toBeDisplayed();
  });
});
