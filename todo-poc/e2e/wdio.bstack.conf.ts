import 'dotenv/config';

export const config: WebdriverIO.Config = {
  runner: 'local',

  specs: ['./specs/**/*.spec.ts'],

  maxInstances: 1,

  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,

  // The `app` value below can be a local file path (auto-uploaded once per
  // run) or a `bs://<app_id>` from a previous upload to skip re-uploading.
  services: [
    [
      'browserstack',
      {
        app: process.env.BROWSERSTACK_APP_PATH,
        testObservability: false,
      },
    ],
  ],

  capabilities: [
    {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'bstack:options': {
        deviceName: 'iPhone 15',
        osVersion: '17',
        projectName: 'todo-poc',
        buildName: 'todo-poc e2e',
        sessionName: 'TODO app',
        debug: true,
        networkLogs: true,
      },
    },
  ],

  logLevel: 'info',

  framework: 'mocha',

  reporters: ['spec'],

  mochaOpts: {
    timeout: 180000,
  },
};
