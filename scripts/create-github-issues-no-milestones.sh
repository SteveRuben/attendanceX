#!/bin/bash

# GitHub Issues Creator (No Milestones)
# Usage: ./scripts/create-github-issues-no-milestones.sh [--dry-run]

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

echo -e "${BLUE}GitHub Issues Creator (No Milestones)${NC}"
echo -e "${BLUE}====================================${NC}"
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
    
    # Extract title
    local title=$(grep -A 1 "## Issue Title" "$file" | tail -1 | sed 's/`//g' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | tr -d '\r')
    
    # Extract labels and clean them
    local labels_raw=$(grep -A 1 "## Labels" "$file" | tail -1)
    local labels=$(echo "$labels_raw" | sed 's/`//g' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | tr -d '\r')
    
    # Create body file (everything after "## Issue Body")
    local body_file=$(mktemp)
    sed -n '/## Issue Body/,$p' "$file" | tail -n +3 > "$body_file"
    
    echo "  Title: '$title'"
    echo "  Labels: '$labels'"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "  ${YELLOW}[DRY RUN] Would create issue${NC}"
        rm "$body_file"
        return
    fi
    
    # Create issue WITHOUT milestone
    echo "  Creating issue..."
    
    # Build command step by step
    local gh_cmd="gh issue create --repo $REPO_OWNER/$REPO_NAME --title \"$title\" --body-file \"$body_file\""
    
    # Add labels if present
    if [[ -n "$labels" && "$labels" != "" ]]; then
        IFS=',' read -ra LABEL_ARRAY <<< "$labels"
        for label in "${LABEL_ARRAY[@]}"; do
            label=$(echo "$label" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
            if [[ -n "$label" ]]; then
                gh_cmd="$gh_cmd --label \"$label\""
            fi
        done
    fi
    
    if eval "$gh_cmd"; then
        echo -e "  ${GREEN}✓ Success${NC}"
    else
        echo -e "  ${RED}✗ Failed${NC}"
    fi
    
    rm "$body_file"
    echo ""
}

# Process files
success_count=0
for file in $issue_files; do
    create_issue "$file"
    ((success_count++))
done

if [[ "$DRY_RUN" == "false" ]]; then
    echo -e "${GREEN}Completed! Created $success_count issues${NC}"
    echo -e "${BLUE}View issues: https://github.com/$REPO_OWNER/$REPO_NAME/issues${NC}"
    echo ""
    echo -e "${YELLOW}Note: Milestones were not added. Create milestones first with create-milestones.sh${NC}"
else
    echo -e "${YELLOW}Dry run completed.${NC}"
fi