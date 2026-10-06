/**
 * Scenario: Weekend Tasks - Create list, add 5 tasks, mark all complete,
 * verify 5/5 progress on the todo-list management page.
 */

const LIST_NAME = 'weekend tasks';

const TASKS = [
  'Buy groceries',
  'Clean the house',
  'Do laundry',
  'Call family',
  'Plan next week',
];

/**
 * Press the element matching `selector` for `durationMs` using the W3C actions
 * API. React Native's touch responder on iOS does not reliably fire for a
 * `Pressable` (that also defines `onLongPress`) via WDA's native `.click()`,
 * so we drive real pointer down/up events instead.
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
 * Type a task and press ADD. The software keyboard stays up afterwards, and on
 * iOS the next tap would only dismiss it — so close it here to keep taps
 * landing on the list.
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

describe('Weekend Tasks - full lifecycle', () => {
  it('creates "weekend tasks" list, adds 5 tasks, marks all complete, verifies 5/5 on list page', async () => {
    // Step 1: Create a todo list named "weekend tasks"
    await (await $('~list-name-input')).setValue(LIST_NAME);
    await (await $('~create-list-button')).click();
    if (await browser.isKeyboardShown()) {
      await browser.hideKeyboard();
    }

    // Step 2: Enter the list details screen
    await (
      await $(`-ios predicate string:label == "${LIST_NAME} 0/0"`)
    ).click();

    // Wait for the task counter to confirm we are on the detail screen
    await (await $('~task-counter')).waitForDisplayed();
    await expect(await counterText()).toBe('0/0 completed');

    // Add 5 tasks one by one
    for (const task of TASKS) {
      await addTask(task);
    }

    // Verify all 5 tasks were added
    await expect(await counterText()).toBe('0/5 completed');

    // Step 3: Mark all 5 tasks as completed
    // Tasks are rendered with testID `task-row-<id>` (dynamic), but tapping
    // each task-text element (which carries the task label as accessibility id)
    // works reliably via the `~<taskText>` selector from the existing suite.
    for (const task of TASKS) {
      await tap(`~${task}`);
    }

    // All 5 should now be completed
    await expect(await counterText()).toBe('5/5 completed');

    // Step 4: Go back to the todo-list management page
    await tap('~back-button');

    // Verify the "weekend tasks" row shows 5/5
    const listRow = await $(`-ios predicate string:label == "${LIST_NAME} 5/5"`);
    await listRow.waitForDisplayed({ timeout: 5000 });
    await expect(listRow).toBeDisplayed();
  });
});
