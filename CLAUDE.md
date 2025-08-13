# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Chromatic is a build system for managing cross-platform design systems using design tokens. It generates platform-specific files (CSS, Sass, iOS, Android) from YAML/JSON token definitions with support for themes, expressions, and references.

### Recent Enhancements
- **OKLCh Color Space Support**: Added `oklch()` and `okhsl()` functions for perceptually uniform color manipulation
- **Improved Color Scales**: The `scale()` function now uses OKLCh interpolation for better perceptual uniformity
- **Interactive Color Scale Explorer**: Created `color-scale-explorer.html` - an interactive tool for exploring OKLCh color scales with real-time visualization
- **HTML Template Improvements**: Fixed chroma/hue plot positioning in generated HTML color documentation

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
- **color-functions.ts**: Color manipulation functions including `scale()`, `mix()`, and OKLCh conversions
- **formats-styleguide.ts**: HTML template generation with color visualization charts

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

## Color System Features

### Scale Function
The `scale()` function generates perceptually uniform color ramps:
- Single color: `scale(oklch(0.6 0.25 260deg))` - generates 11-step ramp from light to dark
- Two colors: `scale(color1, color2)` - interpolates between colors
- Three colors: `scale(low, mid, high)` - creates gradient through three anchor points

### Interactive Tools
- **color-scale-explorer.html**: Interactive OKLCh color scale explorer with:
  - Real-time slider controls for Lightness, Chroma, and Hue
  - Dynamic gradient backgrounds showing value ranges
  - URL persistence for sharing configurations
  - Copy buttons to generate `scale()` function syntax
  - Lightness distribution and chroma/hue polar plot visualizations

### Known Issues Fixed
- Chroma/hue plot in HTML templates now correctly positions hues (0° at top, not right)