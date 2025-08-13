# Chromatic Project Overview

## Purpose
Chromatic is a build system for managing cross-platform design systems using design tokens. It generates platform-specific files from source files describing design tokens.

## Key Features
- **Expressive Design Tokens**: Supports rich expressions with arithmetic operations, units, functions, and references to other tokens
- **Themes Support**: Each token can have theme variants (dark/light, compact/cozy)
- **Zero-conf**: Simple YAML or JSON token files are all you need to get started
- **Multi-platform**: Generates artifacts for web (Sass, CSS), iOS (JSON, plist), Android (XML), and HTML style guides
- **CLI and API**: Available as both a command-line tool and a programmatic API

## Tech Stack
- **Language**: TypeScript (ES2019 target)
- **Build Tool**: Rollup
- **Testing**: Jest
- **Linting**: ESLint with TypeScript plugin
- **Formatting**: Prettier
- **Package Manager**: npm (Node >=16.14.2)

## Main Dependencies
- chalk (terminal colors)
- chokidar (file watching)
- chroma-js, color (color manipulation)
- handlebars (templating)
- yaml, json5 (config parsing)
- yargs (CLI arguments)
- cosmiconfig (config file discovery)

## Repository Structure
- `/src` - TypeScript source code
- `/bin` - Compiled JavaScript output (generated)
- `/test` - Jest test files
- `/scripts` - Build and test shell scripts
- `/config` - Rollup configuration
- `/examples` - Example token files
- `/docs` - Documentation
- `/src/templates` - Handlebars templates for output formats