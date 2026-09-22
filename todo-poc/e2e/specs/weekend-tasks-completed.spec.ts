/**
 * Scenario: Weekend Tasks – create list, add 5 tasks, mark all completed,
 * verify the management page shows "weekend tasks 5/5".
 */

const LIST_NAME = 'weekend tasks';
const TASKS = [
  'Buy groceries',
  'Clean the house',
  'Do laundry',
  'Mow the lawn',
  'Cook dinner',
];

/**
 * Drive a real touch-pointer press of `durationMs` so that React Native's
 * Pressable/onPress fires reliably on iOS WDA (same technique used in todo.spec.ts).
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
 * Type a task text and press the ADD button.
 * Hides the software keyboard afterwards so subsequent taps land correctly.
 */
async function addTask(text: string) {
  await (await $('~task-input')).setValue(text);
  await (await $('~add-task-button')).click();
  if (await browser.isKeyboardShown()) {
    await browser.hideKeyboard();
  }
}

/**
 * Create a new todo-list and navigate into its detail screen.
 */
async function openNewList(name: string) {
  await (await $('~list-name-input')).setValue(name);
  await (await $('~create-list-button')).click();
  if (await browser.isKeyboardShown()) {
    await browser.hideKeyboard();
  }
  await (await $(`-ios predicate string:label == "${name} 0/0"`)).click();
}

async function counterText() {
  const counter = await $('~task-counter');
  await counter.waitForDisplayed();
  return counter.getText();
}

describe('Weekend Tasks – create, add 5 tasks, complete all, verify list progress', () => {
  it('creates the "weekend tasks" list and opens it', async () => {
    await openNewList(LIST_NAME);
    await expect(await counterText()).toBe('0/0 completed');
  });

  it('adds 5 tasks to the list', async () => {
    for (const task of TASKS) {
      await addTask(task);
    }
    await expect(await counterText()).toBe('0/5 completed');
  });

  it('marks all 5 tasks as completed', async () => {
    // Each task row uses testID `task-row-<uuid>`, but they are also accessible
    // via the task text label rendered inside each row.  We tap them by their
    // text accessibility selector — the task text element carries testID
    // `task-text-<uuid>` but NOT an accessibilityLabel, so we match by
    // predicate on the label attribute that equals the task name.
    for (const task of TASKS) {
      await tap(`-ios predicate string:label == "${task}"`);
    }
    await expect(await counterText()).toBe('5/5 completed');
  });

  it('goes back to the list management page and shows "weekend tasks" with 5/5', async () => {
    await tap('~back-button');

    // The list row accessibilityLabel is built as "<name> <done>/<total>".
    const listRow = await $(`-ios predicate string:label == "${LIST_NAME} 5/5"`);
    await listRow.waitForDisplayed({ timeout: 5000 });
    await expect(listRow).toBeDisplayed();
  });
});
