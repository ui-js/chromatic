# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Chromatic is a build system for managing cross-platform design systems using design tokens. It generates platform-specific files (CSS, Sass, iOS, Android) from YAML/JSON token definitions with support for themes, expressions, and references.

## Essential Commands

### Development
```bash
npm run build          # Build development version
npm run build:prod     # Build production version
npm test              # Run all tests
npm run coverage      # Run tests with coverage
npm run snapshot      # Update test snapshots
npm run lint          # Format code with Prettier
npm run watch         # Watch mode for development
```

### Running Chromatic
```bash
npm run chromatic                    # Run local CLI
chromatic tokens.yaml -o output.css  # Generate output
chromatic example ./test             # Create example
```

## Architecture

### Core Components
- **chromatic.ts**: Main API entry point, handles configuration merging, token processing, and output generation
- **chromatic-cli.ts**: CLI interface using yargs, handles file watching and command parsing
- **value-parser.ts**: Parses token expressions (arithmetic, units, functions, references)
- **formats-*.ts**: Output format generators for different platforms

### Key Patterns
- Global state variables prefixed with `g` (gConfig, gTokenValues, gThemes)
- Token evaluation uses recursive expression resolution
- Handlebars templates for output formatting
- Cosmiconfig for configuration discovery

### Token Processing Flow
1. Load and merge configurations (cosmiconfig)
2. Process token files (YAML/JSON)
3. Normalize token definitions
4. Evaluate expressions and references
5. Apply themes
6. Generate platform-specific output

## Code Conventions
- TypeScript with ES2019 target
- No implicit any allowed but explicit any permitted
- Functions: camelCase
- Interfaces: PascalCase
- Files: kebab-case
- Use Prettier for formatting (runs on pre-commit)

## Testing & Quality
- Always run `npm test` before committing
- Format with `npm run lint`
- Tests in `/test` directory using Jest
- Snapshot testing for output validation