#!/bin/bash

# Script to create GitHub labels for the project
# Usage: ./scripts/create-labels.sh

REPO_OWNER="SteveRuben"
REPO_NAME="attendanceX"

echo "Creating GitHub labels for $REPO_OWNER/$REPO_NAME..."

# Phase labels
gh label create "phase/2" --description "Phase 2 - Integrations (Q2 2024)" --color "0052cc" --repo $REPO_OWNER/$REPO_NAME
gh label create "phase/3" --description "Phase 3 - Business Modules (Q3 2024)" --color "5319e7" --repo $REPO_OWNER/$REPO_NAME
gh label create "phase/4" --description "Phase 4 - Intelligence & Scale (Q4 2024)" --color "d73a4a" --repo $REPO_OWNER/$REPO_NAME

# Priority labels
gh label create "priority/high" --description "High priority" --color "d73a4a" --repo $REPO_OWNER/$REPO_NAME
gh label create "priority/medium" --description "Medium priority" --color "fbca04" --repo $REPO_OWNER/$REPO_NAME
gh label create "priority/low" --description "Low priority" --color "0e8a16" --repo $REPO_OWNER/$REPO_NAME

# Module labels
gh label create "module/integrations" --description "Integration system" --color "1d76db" --repo $REPO_OWNER/$REPO_NAME
gh label create "module/appointments" --description "Appointment management" --color "0e8a16" --repo $REPO_OWNER/$REPO_NAME
gh label create "module/crm" --description "Customer relationship management" --color "fbca04" --repo $REPO_OWNER/$REPO_NAME
gh label create "module/sales" --description "Sales and products" --color "d73a4a" --repo $REPO_OWNER/$REPO_NAME
gh label create "module/products" --description "Product management" --color "5319e7" --repo $REPO_OWNER/$REPO_NAME
gh label create "module/ai" --description "AI and machine learning" --color "f9d0c4" --repo $REPO_OWNER/$REPO_NAME

# Component labels
gh label create "component/frontend" --description "Frontend components" --color "c2e0c6" --repo $REPO_OWNER/$REPO_NAME
gh label create "component/backend" --description "Backend services" --color "bfd4f2" --repo $REPO_OWNER/$REPO_NAME
gh label create "component/shared" --description "Shared components" --color "fef2c0" --repo $REPO_OWNER/$REPO_NAME

# Type labels
gh label create "epic" --description "Large feature spanning multiple issues" --color "8b5cf6" --repo $REPO_OWNER/$REPO_NAME
gh label create "testing" --description "Testing related" --color "0e8a16" --repo $REPO_OWNER/$REPO_NAME
gh label create "mobile" --description "Mobile development" --color "1d76db" --repo $REPO_OWNER/$REPO_NAME
gh label create "pwa" --description "Progressive Web App" --color "5319e7" --repo $REPO_OWNER/$REPO_NAME
gh label create "api" --description "API development" --color "fbca04" --repo $REPO_OWNER/$REPO_NAME
gh label create "sdk" --description "Software Development Kit" --color "d73a4a" --repo $REPO_OWNER/$REPO_NAME
gh label create "marketplace" --description "Marketplace and extensions" --color "f9d0c4" --repo $REPO_OWNER/$REPO_NAME
gh label create "extensions" --description "Extension system" --color "c2e0c6" --repo $REPO_OWNER/$REPO_NAME

# Quality labels
gh label create "quality-assurance" --description "Quality assurance" --color "0e8a16" --repo $REPO_OWNER/$REPO_NAME
gh label create "innovation" --description "Innovation and R&D" --color "8b5cf6" --repo $REPO_OWNER/$REPO_NAME
gh label create "cross-platform" --description "Cross-platform development" --color "1d76db" --repo $REPO_OWNER/$REPO_NAME
gh label create "developer-experience" --description "Developer experience" --color "fbca04" --repo $REPO_OWNER/$REPO_NAME
gh label create "ecosystem" --description "Ecosystem development" --color "5319e7" --repo $REPO_OWNER/$REPO_NAME

echo "Labels created successfully!"