#!/bin/bash

# Disable TypeScript checks for build
# Bypass ESLint checks for build
echo "Building Next.js project with skipped checks..."
npx next build --no-lint --no-typescript
