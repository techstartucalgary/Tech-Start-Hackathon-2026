# Linting and Formatting Guide

## Overview

This project uses:
- **ESLint** - Catches code quality issues and bugs
- **Prettier** - Auto-formats code for consistency

## Quick start

```bash
# Check for linting issues
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format all code
npm run format
```

## ESLint

ESLint checks for:
- Unused variables
- Missing semicolons
- Silent errors (e.g., missing await)
- Best practices
- Code consistency

### Configuration

See `.eslintrc.js` for rules. Key rules:

```javascript
'no-console': ['warn', { allow: ['warn', 'error'] }],
// Allow use of logger instead of console.log, but warn on console.warn/error

'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
// Flag unused variables, except those prefixed with _

'prefer-const': 'error',
// Use const instead of let when variable isn't reassigned

'eqeqeq': ['error', 'always'],
// Use === instead of ==

'no-var': 'error',
// Don't use var, use const/let
```

### Usage

```bash
# Check specific file
npm run lint -- src/app.js

# Check specific pattern
npm run lint -- src/services/*.js

# Show details of a rule
npx eslint --print-config src/app.js
```

### Common issues and fixes

**Unused variable**
```javascript
// ❌ Bad
const unused = getValue();

// ✅ Good (prefix with _)
const _unused = getValue();

// OR remove it
const value = getValue();
```

**Missing semicolon**
```javascript
// ❌ Bad
const x = 5

// ✅ Good
const x = 5;
```

**Using == instead of ===**
```javascript
// ❌ Bad
if (value == null) { }

// ✅ Good
if (value === null) { }
```

## Prettier

Prettier auto-formats code consistently:
- 2-space indentation
- Single quotes
- Trailing commas
- Semicolons

### Configuration

See `.prettierrc`:
```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Usage

```bash
# Format all files
npm run format

# Format specific file
npx prettier --write src/app.js

# Check if files are formatted (don't modify)
npx prettier --check src/
```

## Workflow

### Before committing

1. Run linter to catch issues:
   ```bash
   npm run lint
   ```

2. Fix auto-fixable issues:
   ```bash
   npm run lint:fix
   ```

3. Format code:
   ```bash
   npm run format
   ```

4. Run tests:
   ```bash
   npm test
   ```

### Git hooks (optional)

To automatically lint before commit, use `husky`:

```bash
npm install --save-dev husky lint-staged

npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run format && npm test"
```

Now lint, format, and tests run before every commit.

### CI/CD

In your CI pipeline, add:

```yaml
# Example GitHub Actions
- name: Lint
  run: npm run lint

- name: Tests
  run: npm test

- name: Check formatting
  run: npx prettier --check src/
```

This prevents code from merging if it fails lint/format/test checks.

## Best practices

1. **Fix linting issues, don't ignore them**
   ```javascript
   // ❌ Don't do this
   // eslint-disable-next-line no-console
   console.log('debug');

   // ✅ Use the logger instead
   const { logger } = require('./config/logger');
   logger.debug('debug message');
   ```

2. **Format on save** (VS Code)
   ```json
   // In .vscode/settings.json
   {
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "editor.formatOnSave": true,
     "[javascript]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode"
     }
   }
   ```

3. **Keep rules consistent** - Don't ignore rules arbitrarily
   - If a rule bothers you, discuss it with the team
   - Change the rule in `.eslintrc.js`, don't disable per-file

4. **Run tests and lint together**
   ```bash
   npm run lint && npm test
   ```

## Extending ESLint

To add more rules or plugins:

```bash
npm install --save-dev eslint-plugin-security

// Then in .eslintrc.js
module.exports = {
  extends: ['eslint:recommended', 'plugin:security/recommended'],
};
```

Popular plugins:
- `eslint-plugin-security` - Security best practices
- `eslint-plugin-jest` - Jest testing guidelines
- `eslint-plugin-node` - Node.js best practices
