export const config: WebdriverIO.Config = {
  runner: 'local',

  specs: ['./specs/**/*.spec.ts'],

  maxInstances: 1,

  hostname: '127.0.0.1',
  port: 4723,
  path: '/',

  capabilities: [
    {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': 'iPhone 17 Pro',
      'appium:platformVersion': '26.5',
      'appium:bundleId': 'com.anonymous.todo-poc',
      'appium:noReset': false,
    },
  ],

  logLevel: 'info',

  framework: 'mocha',

  reporters: ['spec'],

  mochaOpts: {
    timeout: 120000,
  },
};