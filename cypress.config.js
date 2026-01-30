const { defineConfig } = require('cypress')

module.exports = defineConfig({
  projectId: 'sjit2h',
  e2e: {
    baseUrl: 'http://mapentity.local:8000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    videoCompression: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.name === 'electron') {
          launchOptions.args.push(
            '--enable-unsafe-swiftshader',
            '--use-gl=swiftshader',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-dev-shm-usage',
            '--ignore-certificate-errors'
          )
        }
        return launchOptions
      })
    }
  },
});
