# Development Commands

## Building
- `npm run build` - Build development version
- `npm run build:prod` - Build production version with minification
- `npm run watch` - Watch mode for development (rollup --watch)
- `npm run clean` - Clean build artifacts

## Testing
- `npm test` - Run all tests
- `npm run coverage` - Run tests with coverage report
- `npm run snapshot` - Update test snapshots

## Code Quality
- `npm run lint` - Format code with Prettier (auto-fixes)
  - Formats: `**/*.{ts,js,css,md,yml,json}`
  - Excludes: vendor directory
- ESLint is run during production builds

## Running Chromatic
- `npm run chromatic` - Run the local chromatic CLI
- `./bin/chromatic` - Direct execution after build

## Git Hooks
- Pre-commit hook via Husky + lint-staged
  - TypeScript files: ESLint fix
  - JS/CSS/JSON/MD files: Prettier formatting

## System Commands (macOS/Darwin)
- Standard Unix commands: `git`, `ls`, `cd`, `grep`, `find`
- Note: macOS may have BSD versions of some utilities

## Example Commands
```bash
# Create example directory
chromatic example ./test

# Generate output files
chromatic ./test -o tokens.scss
chromatic ./test -o tokens.html
chromatic tokens.yaml -o tokens.scss --format scss
```