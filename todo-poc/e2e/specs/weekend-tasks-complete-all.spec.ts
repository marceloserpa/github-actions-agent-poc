const LIST_NAME = 'weekend tasks';
const TASKS = [
  'Buy groceries',
  'Clean the house',
  'Do laundry',
  'Mow the lawn',
  'Call mom',
];

/**
 * Drive a real touch-pointer event so React Native Pressable reliably
 * fires onPress / onLongPress on iOS real devices (BrowserStack WDA).
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

/** Type a task name, tap ADD, then dismiss the keyboard. */
async function addTask(text: string) {
  await (await $('~task-input')).setValue(text);
  await (await $('~add-task-button')).click();
  if (await browser.isKeyboardShown()) {
    await browser.hideKeyboard();
  }
}

describe('Weekend tasks – create list, add 5 tasks, complete all, verify progress', () => {
  it('creates a todo list named "weekend tasks"', async () => {
    const input = await $('~list-name-input');
    await input.waitForDisplayed({ timeout: 10000 });
    await input.setValue(LIST_NAME);

    await (await $('~create-list-button')).click();
    if (await browser.isKeyboardShown()) {
      await browser.hideKeyboard();
    }

    // The new row should appear with 0/0 progress in its accessibility label
    const newRow = await $(`-ios predicate string:label == "${LIST_NAME} 0/0"`);
    await newRow.waitForDisplayed({ timeout: 8000 });
    await expect(newRow).toBeDisplayed();
  });

  it('opens the list and adds 5 tasks', async () => {
    // Navigate into the newly created list
    const listRow = await $(`-ios predicate string:label == "${LIST_NAME} 0/0"`);
    await listRow.waitForDisplayed({ timeout: 8000 });
    await listRow.click();

    // Verify the detail screen counter starts at 0/0
    const counter = await $('~task-counter');
    await counter.waitForDisplayed({ timeout: 8000 });
    await expect(counter).toHaveText('0/0 completed');

    // Add each of the 5 tasks
    for (const task of TASKS) {
      await addTask(task);
    }

    // Counter should now show 0/5
    await expect(counter).toHaveText('0/5 completed');
  });

  it('marks all 5 tasks as completed', async () => {
    const taskList = await $('~task-list');
    await taskList.waitForDisplayed({ timeout: 8000 });

    // Tap each task row to toggle it as done
    for (const task of TASKS) {
      const taskTextEl = await $(`-ios predicate string:name == "task-text-" OR label == "${task}"`);
      // Use the task-list to find task rows; rows are identified by their text label
      const taskRow = await $(`-ios predicate string:label == "${task}"`);
      await taskRow.waitForDisplayed({ timeout: 6000 });
      await tap(`-ios predicate string:label == "${task}"`);
    }

    // Counter should now show 5/5
    const counter = await $('~task-counter');
    await expect(counter).toHaveText('5/5 completed');
  });

  it('goes back and verifies the "weekend tasks" list shows 5/5 on the management page', async () => {
    // Navigate back to the todo lists management screen
    const backButton = await $('~back-button');
    await backButton.waitForDisplayed({ timeout: 8000 });
    await backButton.click();

    // The list row accessibilityLabel is "{name} {completedCount}/{total}"
    const listRow = await $(`-ios predicate string:label == "${LIST_NAME} 5/5"`);
    await listRow.waitForDisplayed({ timeout: 8000 });
    await expect(listRow).toBeDisplayed();
  });
});
