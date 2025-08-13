# Code Style and Conventions

## TypeScript Configuration
- Target: ES2019
- Module: ESNext with Node module resolution
- ESModuleInterop enabled
- No implicit any allowed (noImplicitAny: false)
- Decorators enabled
- Source maps enabled
- Excludes: node_modules, *.spec.ts files, bin directory

## ESLint Rules
- Parser: @typescript-eslint/parser
- Extends: @typescript-eslint/recommended, prettier
- Custom rules:
  - `@typescript-eslint/no-unused-vars`: warn with _ prefix for ignored args
  - `@typescript-eslint/no-explicit-any`: off
  - `@typescript-eslint/no-var-requires`: off
  - `@typescript-eslint/no-use-before-define`: off
  - `indent`: off (handled by Prettier)

## Prettier Configuration
- Uses @cortex-js/prettier-config
- Applied to: TS, JS, CSS, MD, YML, JSON files
- Vendor directory excluded

## Naming Conventions
- Files: kebab-case (e.g., chromatic-cli.ts, value-parser.ts)
- Interfaces: PascalCase (e.g., Config, Options, TokenFile)
- Functions: camelCase (e.g., chromatic, evaluateTokenExpression, normalizeToken)
- Global variables: g prefix (e.g., gConfig, gTokenValues, gThemes)
- Constants: UPPER_CASE for build constants (e.g., PRODUCTION, BUILD_ID)

## Code Organization
- Main entry points: chromatic.ts (API), chromatic-cli.ts (CLI)
- Separate format modules: formats-web.ts, formats-styleguide.ts, formats-generic.ts
- Utility modules: utils.ts, errors.ts, terminal.ts
- Parser modules: value-parser.ts, color-functions.ts

## Import Style
- Use ES module imports
- Group imports: Node built-ins, external packages, internal modules
- Example:
  ```typescript
  import * as fs from 'fs-extra';
  import * as path from 'path';
  import * as yaml from 'yaml';
  import { error, log } from './errors';
  ```

## Error Handling
- Centralized error handling in errors.ts
- Use terminal.ts for colored console output
- Global gIgnoreErrors flag for error suppression option