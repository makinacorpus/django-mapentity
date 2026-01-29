# E2E Tests for Django MapEntity

This directory contains End-to-End (E2E) tests using Playwright to test the Django MapEntity application.

## Setup

1. Install Node.js dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npm run playwright:install
```

3. Set up Django environment:
```bash
# Install Python dependencies
pip install -e .[dev]

# Run migrations
python manage.py migrate

# Compile messages
python manage.py compilemessages

# Collect static files
python manage.py collectstatic --noinput

# Create test data
python manage.py create_test_data --clean --count 10
```

## Running Tests

**Important**: You need to start the Django development server before running tests:

```bash
# In one terminal, start Django server
python manage.py runserver 8000

# In another terminal, run tests
npm run test:e2e
```

### Run all tests
```bash
npm run test:e2e
```

### Run tests in headed mode (with browser visible)
```bash
npm run test:e2e:headed
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

## Test Structure

- `fixtures.ts` - Shared test fixtures and authentication helpers
- `auth.spec.ts` - Authentication and login/logout tests
- `list-views.spec.ts` - Tests for list views and navigation
- `crud-operations.spec.ts` - Create, Read, Update, Delete operations
- `map-interactions.spec.ts` - Map display and interaction tests

## Test Users

The `create_test_data` management command creates the following test users:

- **Admin user**: `e2e_admin` / `admin123`
- **Regular user**: `e2e_user` / `user123`

## CI/CD Integration

Tests are configured to run in GitHub Actions. See `.github/workflows/e2e-tests.yml` for the CI configuration.

The CI workflow:
1. Sets up Python and Node.js environments
2. Installs system and Python dependencies
3. Installs Playwright browsers
4. Runs Django migrations and creates test data
5. Starts Django server
6. Runs E2E tests
7. Uploads test results and reports

## Configuration

Test configuration is in `playwright.config.ts`. Key settings:

- **Base URL**: `http://localhost:8000` (can be overridden with `BASE_URL` env var)
- **Browser**: Chromium (can add Firefox and WebKit)
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure
- **Video**: On failure

## Writing New Tests

1. Create a new `.spec.ts` file in the `e2e/` directory
2. Import test fixtures from `./fixtures`
3. Use `adminPage` or `authenticatedPage` fixtures for authenticated tests
4. Follow the existing test patterns for consistency

Example:
```typescript
import { test, expect } from './fixtures';

test.describe('My Feature', () => {
  test('should do something', async ({ adminPage }) => {
    await adminPage.goto('/my-url/');
    // Your test assertions here
  });
});
```

## Troubleshooting

### Tests fail with connection refused
- Make sure Django server is running on port 8000
- Check that `BASE_URL` is set correctly if using a different port

### Tests timeout
- Increase timeout in playwright.config.ts
- Check if static files are collected properly
- Make sure test data is created

### Browser not found
- Run `npm run playwright:install` to install browsers
- On CI, ensure the workflow installs browsers with dependencies
