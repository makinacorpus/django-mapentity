# E2E Tests with Cypress

This directory contains end-to-end (E2E) tests for django-mapentity using Cypress.

## Prerequisites

- Node.js (v16 or later)
- Python and Django environment set up
- Database with test data

## Installation

Install Cypress and dependencies:

```bash
npm install
```

## Running Tests

### Locally

1. Start the Django development server:
```bash
./manage.py runserver
```

2. Create test data:
```bash
./manage.py create_test_data
```

3. Create a superuser (if not already created):
```bash
./manage.py createsuperuser
# Use username: admin, password: admin
```

4. Run Cypress tests:

**Interactive mode (with Cypress UI):**
```bash
npm run cypress:open
```

**Headless mode (command line):**
```bash
npm run cypress:run
```

### In CI

The E2E tests run automatically in GitHub Actions on every push and pull request.
The CI workflow:
1. Sets up a PostgreSQL database with PostGIS
2. Installs dependencies
3. Creates test data
4. Starts the Django server
5. Runs Cypress tests

## Test Structure

Tests are organized in `cypress/e2e/`:

- `01-list-view.cy.js` - Tests for entity list views, map display, and layer switcher
- `02-create-entity.cy.js` - Tests for creating new entities with geometry
- `03-detail-view.cy.js` - Tests for entity detail pages and document exports
- `04-update-entity.cy.js` - Tests for updating entities (single and bulk)
- `05-delete-entity.cy.js` - Tests for deleting entities (single and bulk)
- `06-filter-search.cy.js` - Tests for filtering and searching
- `07-navigation.cy.js` - Tests for navigation, menu, and page transitions
- `08-auth.cy.js` - Tests for login, logout, and authentication flows
- `09-language.cy.js` - Tests for language switching and i18n
- `10-list-exports.cy.js` - Tests for exporting data (CSV, Shapefile, GPX)

## Custom Commands

Custom Cypress commands are defined in `cypress/support/commands.js`:

- `cy.login()` - Logs in with default admin credentials
- `cy.waitForMap()` - Waits for the MapLibre map to be ready
- `cy.setTinyMceContent()` - Sets content in TinyMCE editor
- `cy.getTinyMceContent()` - Gets content from TinyMCE editor

## Configuration

Cypress configuration is in `cypress.config.js`. Key settings:

- `baseUrl`: http://localhost:8000 (Django development server)
- `viewportWidth`: 1280px
- `viewportHeight`: 720px
- `video`: false (disabled to save space)

## Creating Test Data

Use the Django management command to create test data:

```bash
./manage.py create_test_data --help
```

Options:
- `--cities N` - Number of cities to create (default: 3)
- `--roads N` - Number of roads to create (default: 5)
- `--dummies N` - Number of dummy models to create (default: 10)
- `--geopoints N` - Number of geo points to create (default: 5)
- `--sectors N` - Number of sectors to create (default: 3)
- `--tags N` - Number of tags to create (default: 5)
- `--clear` - Clear existing test data before creating new data

Example:
```bash
./manage.py create_test_data --dummies 20 --cities 5 --clear
```

## Troubleshooting

### Tests fail with "cy.login() is not a function"

Make sure `cypress/support/e2e.js` imports the commands file.

### Map-related tests are flaky

The `cy.waitForMap()` command adds a delay to ensure the MapLibre map is fully initialized. If tests are still flaky, you may need to increase the wait time in the command. The tests use flexible selectors to find map containers (`.maplibre-map`, `#mainmap`, `.map-panel`).

### Server not responding in CI

Check that the server has enough time to start. The CI workflow waits up to 60 seconds for the server to be ready.

### Language switching tests fail

Make sure translations are compiled with `./manage.py compilemessages` before running tests.

### Export tests fail

Export functionality requires:
- Entities with data to export
- Proper permissions (can_export)
- File format handlers (CSV, Shapefile, etc.)

If export buttons are not visible, check that the user has export permissions and that entities exist in the database.
