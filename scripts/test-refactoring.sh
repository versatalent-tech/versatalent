#!/bin/bash

# VersaTalent Refactoring - Phase 6 Test Suite
# Comprehensive testing and verification script
# Date: December 17, 2025

set -e  # Exit on error

echo "=========================================="
echo "VersaTalent Refactoring Test Suite"
echo "Phase 6: Testing & Verification"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
PASSED=0
FAILED=0
WARNINGS=0

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC} - $2"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} - $2"
        ((FAILED++))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠ WARN${NC} - $1"
    ((WARNINGS++))
}

echo "1. Checking TypeScript Compilation..."
echo "--------------------------------------"
if bun run tsc --noEmit > /dev/null 2>&1; then
    print_result 0 "TypeScript compiles without errors"
else
    print_result 1 "TypeScript compilation has errors"
    echo "Run 'bun run tsc --noEmit' to see details"
fi
echo ""

echo "2. Checking for Unused Imports..."
echo "--------------------------------------"
# Check if any of the new utilities are imported
if grep -r "from '@/lib/utils/api-response'" src/app/api/ > /dev/null 2>&1; then
    print_result 0 "New utilities are being used"
else
    print_warning "New utilities not found in API routes (migration in progress)"
fi
echo ""

echo "3. Verifying New Utility Files Exist..."
echo "--------------------------------------"
UTILITY_FILES=(
    "src/lib/utils/api-response.ts"
    "src/lib/middleware/auth.ts"
    "src/lib/utils/formatting.ts"
    "src/lib/utils/validation.ts"
    "src/components/admin/DynamicLoader.tsx"
    "migrations/013_performance_indexes.sql"
)

for file in "${UTILITY_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_result 0 "Found: $file"
    else
        print_result 1 "Missing: $file"
    fi
done
echo ""

echo "4. Checking Migrated API Routes..."
echo "--------------------------------------"
# Check if /api/users uses new utilities
if grep -q "successResponse" src/app/api/users/route.ts 2>/dev/null; then
    print_result 0 "/api/users migrated to new utilities"
else
    print_result 1 "/api/users not migrated"
fi

# Check if /api/talents uses new utilities and auth
if grep -q "withAdminAuth" src/app/api/talents/route.ts 2>/dev/null; then
    print_result 0 "/api/talents has admin authentication"
else
    print_result 1 "/api/talents missing admin authentication"
fi

if grep -q "Validator" src/app/api/talents/route.ts 2>/dev/null; then
    print_result 0 "/api/talents has input validation"
else
    print_result 1 "/api/talents missing input validation"
fi
echo ""

echo "5. Checking Dynamic Imports..."
echo "--------------------------------------"
DYNAMIC_PAGES=(
    "src/app/admin/vip/page.tsx"
    "src/app/admin/nfc/page.tsx"
    "src/app/dashboard/page.tsx"
)

for page in "${DYNAMIC_PAGES[@]}"; do
    if grep -q "dynamic.*import" "$page" 2>/dev/null; then
        print_result 0 "Dynamic imports in: $page"
    else
        print_warning "No dynamic imports in: $page"
    fi
done
echo ""

echo "6. Checking for Removed Test Files..."
echo "--------------------------------------"
REMOVED_FILES=(
    "public/contact-form-test.html"
    "public/test-form.html"
    "public/join-form-test.html"
)

for file in "${REMOVED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_result 0 "Removed: $file"
    else
        print_result 1 "Still exists: $file (should be removed)"
    fi
done
echo ""

echo "7. Verifying Documentation..."
echo "--------------------------------------"
DOCS=(
    "README.md"
    "REFACTORING_COMPLETE.md"
    ".same/QUICK_START.md"
    ".same/refactoring-plan.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        lines=$(wc -l < "$doc")
        if [ "$lines" -gt 50 ]; then
            print_result 0 "Documentation complete: $doc ($lines lines)"
        else
            print_warning "Documentation short: $doc ($lines lines)"
        fi
    else
        print_result 1 "Missing documentation: $doc"
    fi
done
echo ""

echo "8. Checking Linter Status..."
echo "--------------------------------------"
# Run linter and capture output
LINT_OUTPUT=$(bun run lint 2>&1 || true)
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -c "Error:" || true)
LINT_WARNINGS=$(echo "$LINT_OUTPUT" | grep -c "Warning:" || true)

echo "Linter found $LINT_ERRORS errors and $LINT_WARNINGS warnings"

# Check if there are NEW errors from our changes
if echo "$LINT_OUTPUT" | grep -q "api-response\|validation\|formatting\|DynamicLoader"; then
    print_result 1 "New utility files have linting errors"
else
    print_result 0 "New utility files pass linting"
fi
echo ""

echo "9. Checking Bundle Size (Build Test)..."
echo "--------------------------------------"
echo "Running production build to check bundle size..."
if bun run build > /tmp/build_output.log 2>&1; then
    print_result 0 "Production build successful"

    # Check if .next directory exists
    if [ -d ".next" ]; then
        # Get size of main JS bundles
        if [ -d ".next/static/chunks" ]; then
            BUNDLE_SIZE=$(du -sh .next/static/chunks | cut -f1)
            echo "   Bundle size: $BUNDLE_SIZE"
        fi
    fi
else
    print_result 1 "Production build failed"
    echo "   Check /tmp/build_output.log for details"
fi
echo ""

echo "10. Security Checks..."
echo "--------------------------------------"
# Check for exposed secrets or passwords
if grep -r "password.*=.*['\"]" src/app/api/ --include="*.ts" | grep -v "password_hash" | grep -v "//" > /dev/null 2>&1; then
    print_warning "Potential hardcoded passwords found in API routes"
else
    print_result 0 "No hardcoded passwords detected"
fi

# Check that auth middleware is imported where needed
if grep -q "withAdminAuth" src/app/api/talents/route.ts 2>/dev/null; then
    print_result 0 "Admin routes use authentication middleware"
else
    print_warning "Admin routes may not be protected"
fi
echo ""

echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run manual smoke tests (see docs/testing/smoke-tests.md)"
    echo "2. Apply database migration 013"
    echo "3. Deploy to staging"
    echo "4. Run performance verification"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please fix before deploying.${NC}"
    exit 1
fi
