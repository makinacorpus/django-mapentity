const { defineConfig } = require('cypress')

module.exports = defineConfig({
  projectId: 'sjit2h',
  e2e: {
    baseUrl: 'http://mapentity.local:8000',
    allowCypressEnv: false,
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    videoCompression: false,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          // Enable WebGL for MapLibre GL JS
          launchOptions.args.push(
            '--ignore-gpu-blocklist',
            '--enable-webgl',
            '--enable-webgl2',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--disable-dev-shm-usage',
            '--ignore-certificate-errors',
          )
        }
        if (browser.family === 'firefox') {
          // Firefox WebGL settings
          launchOptions.preferences['webgl.disabled'] = false
          launchOptions.preferences['webgl.force-enabled'] = true
        }
        return launchOptions
      })
    }
  },
});
