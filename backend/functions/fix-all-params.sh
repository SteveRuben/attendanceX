#!/bin/bash

# Script to add 'as string' type assertions to all req.params usage
# This fixes TypeScript errors where params can be string | string[]

echo "🔧 Fixing TypeScript param type errors..."

# Find all TypeScript files in controllers, routes, middleware, and webhooks
find src/controllers src/routes src/middleware src/webhooks -name "*.ts" -type f | while read file; do
  # Skip if file doesn't exist
  if [ ! -f "$file" ]; then
    continue
  fi
  
  # Add 'as string' to req.params destructuring
  # Pattern: const { paramName } = req.params;
  # Replace with: const paramName = req.params.paramName as string;
  
  # This is a simple sed replacement - may need manual review
  sed -i.bak 's/const { \([a-zA-Z_][a-zA-Z0-9_]*\) } = req\.params;/const \1 = req.params.\1 as string;/g' "$file"
  
  # Remove backup file
  rm -f "$file.bak"
  
  echo "✅ Processed: $file"
done

echo "✨ Done! Please review the changes and run npm run build to verify."
