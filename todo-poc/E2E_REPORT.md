# E2E Test Run – BrowserStack

## Spec Located

**File:** `todo-poc/e2e/specs/todo.spec.ts`

### Test Suite: `TODO app`

| # | Test Case | Description |
|---|-----------|-------------|
| 1 | `creates a task and updates the counter` | Adds a new task ("Learn Appium") inside a freshly created list ("Appium List") and asserts the counter goes from `0/0 completed` → `0/1 completed` |
| 2 | `marks a task as completed and back` | Taps the task to toggle completion (`0/1 → 1/1`), then taps again to un-complete it (`1/1 → 0/1`) |
| 3 | `deletes a task via long-press confirmation` | Long-presses the task, verifies the delete dialog appears, cancels once (task survives), long-presses again, confirms deletion – task disappears and counter resets to `0/0 completed` |

---

## How to Run on BrowserStack

The project already has a BrowserStack-ready WebdriverIO config at  
`todo-poc/e2e/wdio.bstack.conf.ts` and a convenience npm script:

```bash
npm run test:bstack
# which runs: wdio run e2e/wdio.bstack.conf.ts
```

### Pre-requisites

1. **Secrets** – The following environment variables (or GitHub Actions secrets) must be set:

   | Variable | Where to find |
   |---|---|
   | `BROWSERSTACK_USERNAME` | BrowserStack Account → Settings |
   | `BROWSERSTACK_ACCESS_KEY` | BrowserStack Account → Settings |
   | `BROWSERSTACK_APP_PATH` | Local path to the signed `.ipa` **or** a `bs://<app_id>` from a previous upload |

2. **Build the `.ipa`** – If you don't already have a `bs://` app ID, build it first:
   ```bash
   cd todo-poc
   ./scripts/build-ios.sh        # produces build/todo-poc.ipa
   ```

3. **Run the tests**:
   ```bash
   cd todo-poc
   cp .env.example .env          # fill in credentials + app path
   npm ci
   npm run test:bstack
   ```

### BrowserStack Device Target

| Capability | Value |
|---|---|
| Platform | iOS |
| Automation | XCUITest |
| Device | iPhone 15 |
| OS Version | 17 |
| Project | todo-poc |
| Build | todo-poc e2e |

---

## Expected Results (from README)

```
 "spec" Reporter:
------------------------------------------------------------------
[iOS #0-0] Running: on iOS
[iOS #0-0] Session ID: 7f0779fb-8033-439d-aef7-060db489609d
[iOS #0-0]
[iOS #0-0] » e2e/specs/todo.spec.ts
[iOS #0-0] TODO app
[iOS #0-0]    ✓ creates a task and updates the counter
[iOS #0-0]    ✓ marks a task as completed and back
[iOS #0-0]    ✓ deletes a task via long-press confirmation
[iOS #0-0]
[iOS #0-0] 3 passing (15.2s)
```

---

## GitHub Actions Workflow (add to `.github/workflows/e2e-browserstack.yml`)

To run these tests automatically via GitHub Actions, create the following workflow  
(requires `BROWSERSTACK_USERNAME`, `BROWSERSTACK_ACCESS_KEY`, and  
`BROWSERSTACK_APP_PATH` to be configured as repository secrets):

```yaml
name: E2E Tests – BrowserStack

on:
  workflow_dispatch:
  push:
    branches:
      - main

jobs:
  e2e:
    name: Run Appium E2E on BrowserStack
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: todo-poc

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: todo-poc/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run E2E tests on BrowserStack
        env:
          BROWSERSTACK_USERNAME: ${{ secrets.BROWSERSTACK_USERNAME }}
          BROWSERSTACK_ACCESS_KEY: ${{ secrets.BROWSERSTACK_ACCESS_KEY }}
          BROWSERSTACK_APP_PATH: ${{ secrets.BROWSERSTACK_APP_PATH }}
        run: npm run test:bstack
```

---

## Notes

- The token used by the QA agent **does not have `workflows` scope**, so the  
  `.github/workflows/` file could not be committed automatically. The YAML above  
  should be created by a maintainer with the appropriate permissions.
- All three specs are self-contained and use WebdriverIO + Mocha. No additional  
  test runner configuration is needed beyond what is already committed.
