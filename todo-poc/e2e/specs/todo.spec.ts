const LIST_NAME = 'Appium List';
const TASK = 'Learn Appium';

/**
 * Press the element matching `selector` for `durationMs` using the W3C actions
 * API. React Native's touch responder on iOS does not reliably fire for a
 * `Pressable` (that also defines `onLongPress`) via WDA's native `.click()`,
 * so we drive real pointer down/up events instead. The press must last long
 * enough for WDA to register it (~80ms is too short): a ~300ms press stays
 * below the 500ms `delayLongPress` threshold and fires `onPress`, while a
 * 1200ms press fires `onLongPress`.
 */
async function press(selector: string, durationMs: number) {
  const element = await $(selector).getElement();
  await browser
    .action('pointer', { parameters: { pointerType: 'touch' } })
    .move({ origin: element })
    .down()
    .pause(durationMs)
    .up()
    // BrowserStack's iOS real-device WDA doesn't implement the W3C
    // `DELETE /session/:id/actions` endpoint that `perform()` calls
    // automatically afterwards, so skip it — each call starts a fresh chain.
    .perform(true);
}

const tap = (selector: string) => press(selector, 300);
const longPress = (selector: string) => press(selector, 1200);

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

/**
 * Create a todo list and open it. Tasks now live inside a list's detail
 * screen rather than on the home screen, so every spec needs one first.
 */
async function openNewList(name: string) {
  await (await $('~list-name-input')).setValue(name);
  await (await $('~create-list-button')).click();
  if (await browser.isKeyboardShown()) {
    await browser.hideKeyboard();
  }
  // The row's testID becomes its accessibility id, so `~` would match that
  // instead of the accessibilityLabel — match the label via predicate instead.
  await (await $(`-ios predicate string:label == "${name} 0/0"`)).click();
}

describe('TODO app', () => {
  before(async () => {
    await openNewList(LIST_NAME);
  });

  it('creates a task and updates the counter', async () => {
    await expect(await counterText()).toBe('0/0 completed');

    await addTask(TASK);

    await expect(await $(`~${TASK}`)).toBeDisplayed();
    await expect(await counterText()).toBe('0/1 completed');
  });

  it('marks a task as completed and back', async () => {
    // Tapping the task toggles completion; the counter reflects it.
    await tap(`~${TASK}`);
    await expect(await counterText()).toBe('1/1 completed');

    await tap(`~${TASK}`);
    await expect(await counterText()).toBe('0/1 completed');
  });

  it('deletes a task via long-press confirmation', async () => {
    await longPress(`~${TASK}`);

    // The confirmation popup appears.
    const dialog = await $('~delete-dialog');
    await expect(dialog).toBeDisplayed();

    // Cancelling with "No" keeps the task.
    await (await $('~delete-cancel-button')).click();
    await expect(dialog).not.toBeDisplayed();
    await expect(await $(`~${TASK}`)).toBeDisplayed();
    await expect(await counterText()).toBe('0/1 completed');

    // Long-press again and confirm with "Yes".
    await longPress(`~${TASK}`);
    await (await $('~delete-dialog')).waitForDisplayed();
    await (await $('~delete-confirm-button')).click();

    await expect(await $(`~${TASK}`)).not.toBeDisplayed();
    await expect(await counterText()).toBe('0/0 completed');
  });
});
