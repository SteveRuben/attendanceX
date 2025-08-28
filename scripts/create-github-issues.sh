#!/bin/bash

# Script to create GitHub issues from markdown templates
# Usage: ./scripts/create-github-issues.sh [--dry-run]

set -e

# Configuration
REPO_OWNER="SteveRuben"  # Replace with your GitHub username/organization
REPO_NAME="attendanceX"  # Replace with your repository name
ISSUES_DIR="github-issues"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI.${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

# Function to extract issue data from markdown file
extract_issue_data() {
    local file="$1"
    local title=""
    local labels=""
    local milestone=""
    local body=""
    
    # Extract title (first line after "## Issue Title")
    title=$(grep -A 1 "## Issue Title" "$file" | tail -1 | sed 's/`//g')
    
    # Extract labels (line after "## Labels")
    labels=$(grep -A 1 "## Labels" "$file" | tail -1 | sed 's/`//g' | tr ',' '\n' | sed 's/^ *//g' | tr '\n' ',' | sed 's/,$//')
    
    # Extract milestone (line after "## Milestone")
    milestone=$(grep -A 1 "## Milestone" "$file" | tail -1)
    
    # Extract body (everything after "## Issue Body")
    body=$(sed -n '/## Issue Body/,$p' "$file" | tail -n +3)
    
    echo "TITLE:$title"
    echo "LABELS:$labels"
    echo "MILESTONE:$milestone"
    echo "BODY_START"
    echo "$body"
    echo "BODY_END"
}

# Function to create a single issue
create_issue() {
    local file="$1"
    local dry_run="$2"
    
    echo -e "${BLUE}Processing: $file${NC}"
    
    # Extract issue data
    local issue_data=$(extract_issue_data "$file")
    local title=$(echo "$issue_data" | grep "TITLE:" | cut -d: -f2-)
    local labels=$(echo "$issue_data" | grep "LABELS:" | cut -d: -f2-)
    local milestone=$(echo "$issue_data" | grep "MILESTONE:" | cut -d: -f2-)
    local body=$(echo "$issue_data" | sed -n '/BODY_START/,/BODY_END/p' | sed '1d;$d')
    
    echo -e "  ${YELLOW}Title:${NC} $title"
    echo -e "  ${YELLOW}Labels:${NC} $labels"
    echo -e "  ${YELLOW}Milestone:${NC} $milestone"
    
    if [ "$dry_run" = "true" ]; then
        echo -e "  ${YELLOW}[DRY RUN]${NC} Would create issue with above details"
        return
    fi
    
    # Create the issue
    local cmd="gh issue create --repo $REPO_OWNER/$REPO_NAME --title \"$title\" --body \"$body\""
    
    # Add labels if specified
    if [ -n "$labels" ]; then
        cmd="$cmd --label \"$labels\""
    fi
    
    # Add milestone if specified
    if [ -n "$milestone" ]; then
        cmd="$cmd --milestone \"$milestone\""
    fi
    
    echo -e "  ${YELLOW}Creating issue...${NC}"
    if eval $cmd; then
        echo -e "  ${GREEN}✓ Issue created successfully${NC}"
    else
        echo -e "  ${RED}✗ Failed to create issue${NC}"
    fi
    
    echo ""
}

# Main function
main() {
    local dry_run="false"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run="true"
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [--dry-run]"
                echo ""
                echo "Options:"
                echo "  --dry-run    Show what would be created without actually creating issues"
                echo "  -h, --help   Show this help message"
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                exit 1
                ;;
        esac
    done
    
    echo -e "${BLUE}GitHub Issues Creator${NC}"
    echo -e "${BLUE}====================${NC}"
    echo ""
    
    if [ "$dry_run" = "true" ]; then
        echo -e "${YELLOW}Running in DRY RUN mode - no issues will be created${NC}"
        echo ""
    fi
    
    # Check if issues directory exists
    if [ ! -d "$ISSUES_DIR" ]; then
        echo -e "${RED}Error: Issues directory '$ISSUES_DIR' not found${NC}"
        exit 1
    fi
    
    # Find all markdown files in the issues directory
    local issue_files=$(find "$ISSUES_DIR" -name "*.md" | sort)
    
    if [ -z "$issue_files" ]; then
        echo -e "${YELLOW}No issue files found in $ISSUES_DIR${NC}"
        exit 0
    fi
    
    echo -e "${GREEN}Found $(echo "$issue_files" | wc -l) issue files:${NC}"
    echo "$issue_files" | sed 's/^/  /'
    echo ""
    
    # Confirm before proceeding (unless dry run)
    if [ "$dry_run" = "false" ]; then
        read -p "Do you want to create these issues? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Cancelled."
            exit 0
        fi
        echo ""
    fi
    
    # Create issues
    for file in $issue_files; do
        create_issue "$file" "$dry_run"
    done
    
    if [ "$dry_run" = "false" ]; then
        echo -e "${GREEN}All issues created successfully!${NC}"
        echo -e "${BLUE}View issues at: https://github.com/$REPO_OWNER/$REPO_NAME/issues${NC}"
    else
        echo -e "${YELLOW}Dry run completed. Use without --dry-run to create actual issues.${NC}"
    fi
}

# Run main function
main "$@"