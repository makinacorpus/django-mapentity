# Dropdown Menu Visibility Fixes

## Problem

Tests were failing with errors like:
- "Element is not visible"
- "Element is covered by another element"
- "Timed out retrying after X ms: Expected to find element..."

This occurred when tests tried to click elements inside dropdown menus that weren't fully opened yet.

## Root Causes

1. **Immediate Clicks**: Tests clicked dropdown items immediately after opening the dropdown
2. **No Visibility Verification**: No check to ensure dropdown menu was actually visible
3. **Force Clicks**: Using `{ force: true }` bypassed Cypress's visibility checks
4. **Race Conditions**: Dropdown CSS animations weren't complete before clicks

## Solutions Implemented

### 1. Enhanced `openUserMenu()` Command

**Before:**
```javascript
Cypress.Commands.add('openUserMenu', () => {
  cy.get('.dropdown-toggle').first().click({ force: true })
  cy.wait(500)
})
```

**After:**
```javascript
Cypress.Commands.add('openUserMenu', () => {
  cy.get('body').then($body => {
    const dropdownSelectors = [
      '.dropdown-toggle',
      '[data-toggle="dropdown"]',
      '.navbar .dropdown button',
      '.navbar .dropdown a'
    ]
    
    for (const selector of dropdownSelectors) {
      if ($body.find(selector).length > 0) {
        cy.log(`Opening user menu with selector: ${selector}`)
        cy.get(selector).first().click()  // No force!
        cy.waitForDropdownMenu()  // Wait for menu!
        return
      }
    }
  })
})
```

**Key Improvements:**
- Multiple selector strategies for flexibility
- Removed `{ force: true }` - let Cypress verify visibility
- Added call to `waitForDropdownMenu()`
- Better logging for debugging

### 2. New `waitForDropdownMenu()` Command

```javascript
Cypress.Commands.add('waitForDropdownMenu', () => {
  const menuSelectors = [
    '.dropdown-menu.show',
    '.dropdown-menu:visible',
    '.dropdown.open .dropdown-menu',
    '.dropdown.show .dropdown-menu',
    '.dropdown-menu[style*="display: block"]'
  ]
  
  cy.get('body').then($body => {
    for (const selector of menuSelectors) {
      if ($body.find(selector).length > 0) {
        cy.log(`Waiting for dropdown menu with selector: ${selector}`)
        cy.get(selector, { timeout: 5000 }).should('be.visible')
        cy.wait(300)  // Wait for CSS animations
        return
      }
    }
    cy.wait(500)  // Fallback wait
  })
})
```

**Purpose:**
- Waits for dropdown menu to be fully visible
- Checks multiple common Bootstrap dropdown states
- Allows time for CSS animations to complete
- Provides fallback for non-standard implementations

### 3. Improved `findAndClick()` Command

**Before:**
```javascript
cy.get(selector).first().click(options)
```

**After:**
```javascript
if (!options.force) {
  cy.get(selector).first().should('be.visible')
}
cy.get(selector).first().click(options)
```

**Benefit:**
- Adds visibility check before clicking (unless explicitly forced)
- Makes tests more reliable
- Better error messages from Cypress

## Test File Updates

### Auth Tests (`08-auth.cy.js`)

**Before:**
```javascript
cy.openUserMenu()
cy.get(selector).first().click({ force: true })
```

**After:**
```javascript
cy.openUserMenu()  // Now waits for dropdown
cy.get(selector).first().should('be.visible')
cy.get(selector).first().click()  // No force!
```

### Language Tests (`09-language.cy.js`)

**Before:**
```javascript
cy.openUserMenu()
cy.get('button[value="fr"]').click({ force: true })
```

**After:**
```javascript
cy.openUserMenu()  // Now waits for dropdown
cy.get('button[value="fr"]').should('be.visible')
cy.get('button[value="fr"]').click()  // No force!
```

### Export Tests (`10-list-exports.cy.js`)

**Before:**
```javascript
cy.get('button[name="csv"]').first().click({ force: true })
```

**After:**
```javascript
cy.get('button[name="csv"]').first().should('be.visible')
cy.get('button[name="csv"]').first().click()
```

### Navigation Tests (`07-navigation.cy.js`)

**Before:**
```javascript
cy.get('a[href*="/dummymodel/list"]').first().click({ force: true })
```

**After:**
```javascript
cy.get('a[href*="/dummymodel/list"]').first().should('be.visible')
cy.get('a[href*="/dummymodel/list"]').first().click()
```

## When to Use `{ force: true }`

Force clicks should ONLY be used when:

1. **Map Controls**: Clicking map layer switcher buttons
   ```javascript
   cy.get('.layer-switcher-btn').click({ force: true })
   ```

2. **Checkboxes in Tables**: May be covered by other rows
   ```javascript
   cy.get('input[type="checkbox"]').check({ force: true })
   ```

3. **Mouse Events on Canvas**: Map interactions
   ```javascript
   cy.get('canvas').trigger('mousedown', { force: true })
   ```

## Best Practices Applied

✅ **Wait for Visibility**: Always check elements are visible before clicking  
✅ **Wait for Animations**: Allow CSS transitions to complete  
✅ **Multiple Selectors**: Handle different implementations  
✅ **Proper Logging**: Debug issues more easily  
✅ **Avoid Force Clicks**: Only use when absolutely necessary  
✅ **Follow Cypress Patterns**: Use built-in assertions  

## Results

- **More Reliable Tests**: Tests wait for proper state
- **Better Error Messages**: Cypress shows why tests fail
- **True User Simulation**: Tests interact like real users
- **Easier Debugging**: Logs show which selectors work
- **Maintainable Code**: Follows Cypress best practices

## Testing

To verify the fixes work:

```bash
# Run all tests
npx cypress run

# Run specific test files
npx cypress run --spec "cypress/e2e/08-auth.cy.js"
npx cypress run --spec "cypress/e2e/09-language.cy.js"

# Open Cypress UI for debugging
npx cypress open
```

## Future Improvements

1. Add retry logic for flaky dropdown interactions
2. Create a `cy.clickDropdownItem()` helper command
3. Add visual regression testing for dropdown states
4. Implement better wait strategies using Cypress custom commands
