#!/bin/bash

# Fixed GitHub Issues Creator
# Usage: ./scripts/create-github-issues-fixed.sh [--dry-run]

set -e

# Configuration
REPO_OWNER="SteveRuben"
REPO_NAME="attendanceX"
ISSUES_DIR="github-issues"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}GitHub Issues Creator (Fixed)${NC}"
echo -e "${BLUE}=============================${NC}"
echo ""

# Check prerequisites
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI.${NC}"
    exit 1
fi

# Parse arguments
DRY_RUN="false"
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN="true"
    echo -e "${YELLOW}Running in DRY RUN mode${NC}"
    echo ""
fi

# Check directory
if [[ ! -d "$ISSUES_DIR" ]]; then
    echo -e "${RED}Error: Directory '$ISSUES_DIR' not found${NC}"
    exit 1
fi

# Find files
issue_files=$(find "$ISSUES_DIR" -name "*.md" | sort)
if [[ -z "$issue_files" ]]; then
    echo -e "${YELLOW}No issue files found${NC}"
    exit 0
fi

echo -e "${GREEN}Found $(echo "$issue_files" | wc -l) issue files:${NC}"
echo "$issue_files" | sed 's/^/  /'
echo ""

# Confirm
if [[ "$DRY_RUN" == "false" ]]; then
    read -p "Create these issues? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    echo ""
fi

# Function to create issue
create_issue() {
    local file="$1"
    echo -e "${BLUE}Processing: $file${NC}"
    
    # Extract title (simple approach)
    local title=$(grep -A 1 "## Issue Title" "$file" | tail -1 | sed 's/`//g' | sed 's/^[[:space:]]*//')
    
    # Extract labels
    local labels=$(grep -A 1 "## Labels" "$file" | tail -1 | sed 's/`//g' | sed 's/^[[:space:]]*//')
    
    # Extract milestone
    local milestone=$(grep -A 1 "## Milestone" "$file" | tail -1 | sed 's/^[[:space:]]*//')
    
    # Create body file (everything after "## Issue Body")
    local body_file=$(mktemp)
    sed -n '/## Issue Body/,$p' "$file" | tail -n +3 > "$body_file"
    
    echo "  Title: $title"
    echo "  Labels: $labels"
    echo "  Milestone: $milestone"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "  ${YELLOW}[DRY RUN] Would create issue${NC}"
        rm "$body_file"
        return
    fi
    
    # Create issue
    echo "  Creating issue..."
    local cmd="gh issue create --repo $REPO_OWNER/$REPO_NAME --title \"$title\" --body-file \"$body_file\""
    
    # Add labels if present
    if [[ -n "$labels" && "$labels" != "" ]]; then
        cmd="$cmd --label \"$labels\""
    fi
    
    # Add milestone if present
    if [[ -n "$milestone" && "$milestone" != "" ]]; then
        cmd="$cmd --milestone \"$milestone\""
    fi
    
    if eval $cmd; then
        echo -e "  ${GREEN}✓ Success${NC}"
    else
        echo -e "  ${RED}✗ Failed${NC}"
    fi
    
    rm "$body_file"
    echo ""
}

# Process files
for file in $issue_files; do
    create_issue "$file"
done

if [[ "$DRY_RUN" == "false" ]]; then
    echo -e "${GREEN}Completed!${NC}"
    echo -e "${BLUE}View issues: https://github.com/$REPO_OWNER/$REPO_NAME/issues${NC}"
else
    echo -e "${YELLOW}Dry run completed.${NC}"
fi