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

3. Create test data:
```bash
python manage.py migrate
python manage.py create_test_data --clean
```

## Running Tests

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
