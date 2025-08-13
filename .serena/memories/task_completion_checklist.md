# Task Completion Checklist

When completing any development task in the Chromatic codebase, ensure:

## Before Committing
1. **Format Code**: Run `npm run lint` to format all code with Prettier
2. **Test Changes**: Run `npm test` to ensure all tests pass
3. **Update Snapshots**: If test output changed intentionally, run `npm run snapshot`
4. **Build Check**: Run `npm run build` to ensure TypeScript compiles without errors

## Code Quality Checks
- TypeScript compiles without errors
- No ESLint warnings in production build
- Tests pass (including any new tests added)
- Code follows existing patterns and conventions
- No console.log statements left in production code

## For Feature Development
- Add appropriate tests in `/test` directory
- Update examples if applicable
- Consider theme support for new features
- Ensure cross-platform compatibility (web/iOS/Android)

## For Bug Fixes
- Add regression test if possible
- Verify fix doesn't break existing functionality
- Check all output formats still work correctly

## Documentation
- Update inline comments for complex logic
- Update README.md if user-facing changes
- Update CHANGELOG.md for notable changes

## Git Workflow
- Husky pre-commit hooks will auto-format staged files
- Ensure commit messages are descriptive
- Reference issue numbers when applicable