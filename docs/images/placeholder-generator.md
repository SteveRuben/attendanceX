# Placeholder Image Generator

This document provides instructions for creating placeholder images for the AttendanceX documentation.

## Required Images

### 1. Architecture Overview (1200x800px)
**File**: `architecture-overview.png`
**Content**: Multi-tenant architecture diagram showing:
- Frontend layer (React/Next.js)
- Backend services (Node.js/Firebase)
- Database layer (Firestore)
- Security boundaries between tenants

### 2. Attendance Dashboard (1920x1080px)
**File**: `attendance-dashboard.png`
**Content**: Real-time attendance tracking interface showing:
- Current attendance status
- Check-in/out buttons
- Location map
- Time tracking widgets
- Team presence overview

### 3. CRM Dashboard (1920x1080px)
**File**: `crm-dashboard.png`
**Content**: Customer relationship management interface showing:
- Customer list/grid
- Sales pipeline
- Recent activities
- Contact information
- Deal tracking

### 4. Analytics Dashboard (1920x1080px)
**File**: `analytics-dashboard.png`
**Content**: Business intelligence dashboard showing:
- Key performance indicators
- Charts and graphs
- Attendance trends
- Sales metrics
- Real-time data

### 5. Dark Mode Preview (1920x1080px)
**File**: `dark-mode-preview.png`
**Content**: Split view showing light/dark mode comparison

## Quick Placeholder Generation

### Using Figma (Recommended)

1. **Create New File**
   - Set canvas size to required dimensions
   - Use AttendanceX brand colors

2. **Brand Colors**
   ```
   Primary: #007ACC (Blue)
   Secondary: #20232A (Dark Gray)
   Accent: #61DAFB (Light Blue)
   Success: #22c55e (Green)
   Warning: #f59e0b (Orange)
   Error: #ef4444 (Red)
   ```

3. **Typography**
   - Primary: Inter, system-ui, sans-serif
   - Monospace: JetBrains Mono, monospace

4. **Layout Guidelines**
   - Use consistent spacing (8px grid)
   - Include realistic data
   - Show interactive elements
   - Add subtle shadows and borders

### Using Online Tools

#### Placeholder.com
```html
<!-- Architecture Overview -->
<img src="https://via.placeholder.com/1200x800/007ACC/FFFFFF?text=AttendanceX+Architecture" alt="Architecture Overview">

<!-- Dashboard Screenshots -->
<img src="https://via.placeholder.com/1920x1080/20232A/FFFFFF?text=Attendance+Dashboard" alt="Attendance Dashboard">
<img src="https://via.placeholder.com/1920x1080/007ACC/FFFFFF?text=CRM+Dashboard" alt="CRM Dashboard">
<img src="https://via.placeholder.com/1920x1080/61DAFB/000000?text=Analytics+Dashboard" alt="Analytics Dashboard">
```

#### Unsplash (for backgrounds)
```
https://source.unsplash.com/1920x1080/?office,technology
https://source.unsplash.com/1200x800/?dashboard,analytics
```

### Using Code (HTML/CSS)

Create HTML mockups and screenshot them:

```html
<!DOCTYPE html>
<html>
<head>
    <title>AttendanceX Dashboard</title>
    <style>
        body { 
            font-family: 'Inter', sans-serif; 
            margin: 0; 
            background: #f8fafc;
        }
        .dashboard { 
            display: grid; 
            grid-template-columns: 250px 1fr; 
            height: 100vh; 
        }
        .sidebar { 
            background: #20232A; 
            color: white; 
            padding: 20px; 
        }
        .main { 
            padding: 20px; 
        }
        .card { 
            background: white; 
            border-radius: 8px; 
            padding: 20px; 
            margin-bottom: 20px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
        }
        .metric { 
            font-size: 2rem; 
            font-weight: bold; 
            color: #007ACC; 
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="sidebar">
            <h2>AttendanceX</h2>
            <nav>
                <div>📊 Dashboard</div>
                <div>👥 Users</div>
                <div>⏰ Attendance</div>
                <div>📅 Calendar</div>
                <div>💰 Sales</div>
            </nav>
        </div>
        <div class="main">
            <h1>Dashboard</h1>
            <div class="card">
                <h3>Today's Attendance</h3>
                <div class="metric">87%</div>
                <p>23 of 26 employees present</p>
            </div>
            <div class="card">
                <h3>Sales This Month</h3>
                <div class="metric">$45,230</div>
                <p>↗️ 12% increase from last month</p>
            </div>
        </div>
    </div>
</body>
</html>
```

## Screenshot Tools

### Browser Extensions
- **Full Page Screen Capture** (Chrome)
- **Awesome Screenshot** (Firefox/Chrome)
- **Nimbus Screenshot** (Cross-browser)

### Desktop Applications
- **Snagit** (Windows/Mac) - Professional
- **LightShot** (Free, cross-platform)
- **Greenshot** (Free, Windows)
- **Skitch** (Mac) - Simple annotation

### Command Line Tools
```bash
# Using Puppeteer (Node.js)
npm install puppeteer

# Screenshot script
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000');
  await page.screenshot({ path: 'dashboard.png' });
  await browser.close();
})();
```

## Image Optimization

### Compression Tools
```bash
# Install imagemin
npm install -g imagemin-cli imagemin-pngquant

# Optimize images
imagemin docs/images/*.png --out-dir=docs/images/optimized --plugin=pngquant

# Or use online tools:
# - TinyPNG.com
# - Squoosh.app
# - ImageOptim (Mac)
```

### File Size Guidelines
- **Screenshots**: < 500KB each
- **Diagrams**: < 200KB each
- **Icons**: < 50KB each
- **Total**: Keep all images under 5MB

## Automated Screenshot Generation

### GitHub Actions Workflow

```yaml
name: Generate Screenshots

on:
  push:
    branches: [ main ]
    paths: [ 'frontend/**' ]

jobs:
  screenshots:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Start application
        run: npm start &
        
      - name: Wait for app to start
        run: sleep 30
        
      - name: Generate screenshots
        run: node scripts/generate-screenshots.js
        
      - name: Commit screenshots
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/images/
          git commit -m "Update screenshots" || exit 0
          git push
```

## Manual Creation Checklist

- [ ] Create architecture diagram (1200x800)
- [ ] Screenshot attendance dashboard (1920x1080)
- [ ] Screenshot CRM interface (1920x1080)
- [ ] Screenshot analytics dashboard (1920x1080)
- [ ] Create dark mode comparison (1920x1080)
- [ ] Optimize all images for web
- [ ] Update README image references
- [ ] Test image loading in documentation
- [ ] Add alt text for accessibility

## Resources

- **Figma Community**: Search for dashboard templates
- **Dribbble**: UI inspiration
- **UI8**: Premium dashboard designs
- **Unsplash**: High-quality stock photos
- **Pexels**: Free stock images
- **Canva**: Quick design tool