const { defineConfig } = require('cypress')

module.exports = defineConfig({
  projectId: 'sjit2h',
  e2e: {
    baseUrl: 'http://localhost:8000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--enable-unsafe-swiftshader')
        }
        return launchOptions
      })
    },
  },
});
