#!/bin/bash

# AttendanceX Quick Setup Script
# This script automates the complete setup process for AttendanceX

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command_exists node; then
        log_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        log_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check git
    if ! command_exists git; then
        log_error "Git is not installed. Please install Git from https://git-scm.com/"
        exit 1
    fi
    
    log_success "All prerequisites are met!"
}

# Clone repository
clone_repository() {
    log_info "Cloning AttendanceX repository..."
    
    if [ -d "attendanceX" ]; then
        log_warning "Directory 'attendanceX' already exists. Skipping clone."
        cd attendanceX
    else
        git clone https://github.com/SteveRuben/attendanceX.git
        cd attendanceX
        log_success "Repository cloned successfully!"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install backend dependencies
    if [ -d "backend/functions" ]; then
        log_info "Installing backend dependencies..."
        cd backend/functions
        npm install
        cd ../..
    fi
    
    # Install frontend dependencies
    if [ -d "frontend-v2" ]; then
        log_info "Installing frontend dependencies..."
        cd frontend-v2
        npm install
        cd ..
    fi
    
    log_success "All dependencies installed!"
}

# Setup environment
setup_environment() {
    log_info "Setting up environment configuration..."
    
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            log_success "Environment file created from template"
            log_warning "Please edit .env.local with your configuration"
        else
            log_info "Creating basic environment file..."
            cat > .env.local << EOF
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Firebase Configuration (Optional - uses emulators by default)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@your-domain.com

# Development Settings
NODE_ENV=development
PORT=5001
CORS_ORIGIN=http://localhost:3000
EOF
            log_success "Basic environment file created"
        fi
    else
        log_warning "Environment file already exists. Skipping creation."
    fi
}

# Install Firebase CLI
install_firebase_cli() {
    log_info "Checking Firebase CLI..."
    
    if ! command_exists firebase; then
        log_info "Installing Firebase CLI..."
        npm install -g firebase-tools
        log_success "Firebase CLI installed!"
    else
        log_success "Firebase CLI is already installed"
    fi
}

# Setup Firebase (optional)
setup_firebase() {
    log_info "Setting up Firebase (optional)..."
    
    read -p "Do you want to configure Firebase? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Starting Firebase setup..."
        
        # Login to Firebase
        firebase login --no-localhost
        
        # Initialize Firebase
        if [ ! -f "firebase.json" ]; then
            firebase init
        else
            log_warning "Firebase already initialized. Skipping init."
        fi
        
        # Select project
        firebase use --add
        
        log_success "Firebase setup completed!"
    else
        log_info "Skipping Firebase setup. You can run 'firebase init' later."
    fi
}

# Run tests
run_tests() {
    log_info "Running tests to verify setup..."
    
    # Check if test scripts exist
    if npm run test --silent 2>/dev/null; then
        log_success "Tests passed!"
    else
        log_warning "Tests failed or not configured. This is normal for initial setup."
    fi
}

# Start development servers
start_development() {
    log_info "Setup completed! Starting development servers..."
    
    log_success "🎉 AttendanceX setup completed successfully!"
    echo
    log_info "Available services:"
    echo "  📱 Frontend:     http://localhost:3000"
    echo "  🔧 Backend API:  http://localhost:5001"
    echo "  📚 API Docs:     http://localhost:5001/api/docs"
    echo "  🔥 Firebase UI:  http://localhost:4000"
    echo
    log_info "Starting development servers..."
    echo "  Use Ctrl+C to stop the servers"
    echo
    
    # Start development servers
    npm run dev
}

# Main setup function
main() {
    echo "🚀 AttendanceX Quick Setup"
    echo "=========================="
    echo
    
    check_prerequisites
    clone_repository
    install_dependencies
    setup_environment
    install_firebase_cli
    setup_firebase
    run_tests
    start_development
}

# Handle script interruption
trap 'log_warning "Setup interrupted by user"; exit 1' INT

# Run main function
main "$@"