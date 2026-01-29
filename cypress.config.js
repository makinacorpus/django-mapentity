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
        if (browser.name === 'electron') {
          // Active SwiftShader pour Electron
          launchOptions.preferences = launchOptions.preferences || {}
          launchOptions.args.push('--enable-unsafe-swiftshader')
          launchOptions.args.push('--disable-gpu') // optionnel mais stable
          launchOptions.args.push('--disable-dev-shm-usage') // utile en CI
        }
        return launchOptions
      })
    },
  },
});
