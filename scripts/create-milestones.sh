#!/bin/bash

# Script to create GitHub milestones
# Usage: ./scripts/create-milestones.sh

REPO_OWNER="SteveRuben"
REPO_NAME="attendanceX"

echo "Creating GitHub milestones for $REPO_OWNER/$REPO_NAME..."

# Create milestones using GitHub API
gh api repos/$REPO_OWNER/$REPO_NAME/milestones -X POST \
    -f title="Phase 2 - Integrations (Q2 2025)" \
    -f description="Complete OAuth 2.0 integration system with UI and testing" \
    -f due_on="2025-06-30T23:59:59Z"

gh api repos/$REPO_OWNER/$REPO_NAME/milestones -X POST \
    -f title="Phase 3 - Business Modules (Q3 2025)" \
    -f description="Appointment management, CRM, sales, and mobile PWA" \
    -f due_on="2025-09-30T23:59:59Z"

gh api repos/$REPO_OWNER/$REPO_NAME/milestones -X POST \
    -f title="Phase 4 - Intelligence & Scale (Q4 2025)" \
    -f description="AI recommendations, public API, SDK, and marketplace" \
    -f due_on="2025-12-31T23:59:59Z"

echo "Milestones created successfully!"