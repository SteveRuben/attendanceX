# AttendanceX Documentation Site

This directory contains the GitHub Pages site for AttendanceX, providing comprehensive documentation and project information.

## 🌐 Live Site

Visit the live documentation at: [https://steveRuben.github.io/attendanceX](https://steveRuben.github.io/attendanceX)

## 📁 Structure

```
docs/
├── index.html              # Main landing page
├── styles/
│   └── main.css           # Site styles
├── scripts/
│   └── main.js            # Site functionality
├── assets/
│   ├── logo.svg           # AttendanceX logo
│   ├── favicon.svg        # Site favicon
│   └── *.png              # Placeholder images
├── api/                   # API documentation
├── getting-started/       # Setup guides
├── architecture/          # Technical documentation
├── security/              # Security guides
├── testing/               # Testing documentation
├── deployment/            # Deployment guides
├── _config.yml            # Jekyll configuration
├── sw.js                  # Service Worker (PWA)
└── README.md              # This file
```

## 🚀 Local Development

To run the documentation site locally:

### Option 1: Simple HTTP Server
```bash
# Navigate to docs directory
cd docs

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have http-server installed)
npx http-server -p 8000

# Visit: http://localhost:8000
```

### Option 2: Jekyll (for full GitHub Pages compatibility)
```bash
# Install Jekyll
gem install jekyll bundler

# Navigate to docs directory
cd docs

# Install dependencies
bundle install

# Serve the site
bundle exec jekyll serve

# Visit: http://localhost:4000
```

## 📝 Content Updates

### Adding New Documentation
1. Create new markdown files in appropriate subdirectories
2. Update navigation links in `index.html` if needed
3. Follow the established documentation structure

### Updating Images
1. Replace placeholder images in `assets/` directory
2. Recommended sizes:
   - `dashboard-preview.png`: 800x600px
   - `demo-preview.png`: 600x400px
   - `og-image.png`: 1200x630px (for social media)

### Updating Styles
- Edit `styles/main.css` for visual changes
- Follow the existing CSS custom properties for consistency
- Test responsive design on multiple screen sizes

### Updating Functionality
- Edit `scripts/main.js` for interactive features
- Maintain accessibility and performance standards
- Test across different browsers

## 🎨 Design System

The site follows AttendanceX's design system:

### Colors
- Primary: `#3b82f6` (Blue 500)
- Primary Dark: `#1d4ed8` (Blue 700)
- Gray Scale: `#f9fafb` to `#111827`
- Success: `#10b981`
- Warning: `#f59e0b`
- Error: `#ef4444`

### Typography
- Font Family: Inter (with system fallbacks)
- Headings: 700-800 weight
- Body: 400-500 weight
- Code: Monaco, Menlo, Ubuntu Mono

### Spacing
- Base unit: 0.25rem (4px)
- Common spacing: 1rem, 1.5rem, 2rem, 3rem, 4rem

## 📱 Progressive Web App (PWA)

The site includes PWA features:
- Service Worker for offline caching
- Responsive design for mobile devices
- Fast loading and smooth animations

## 🔧 GitHub Pages Configuration

The site is configured for GitHub Pages with:
- Jekyll for static site generation
- Custom domain support (if configured)
- Automatic deployment on push to main branch

### Enabling GitHub Pages
1. Go to repository Settings
2. Navigate to Pages section
3. Select "Deploy from a branch"
4. Choose "main" branch and "/docs" folder
5. Save configuration

## 📊 Analytics

The site includes Google Analytics integration:
- Update `GA_MEASUREMENT_ID` in `index.html`
- Configure tracking in Google Analytics console
- Monitor page views and user interactions

## 🔍 SEO Optimization

The site is optimized for search engines:
- Semantic HTML structure
- Meta tags for social media sharing
- Structured data markup
- Fast loading times
- Mobile-friendly design

## 🧪 Testing

Test the site before deploying:

### Manual Testing
- [ ] All links work correctly
- [ ] Images load properly
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Copy buttons function correctly
- [ ] Navigation menu works on mobile
- [ ] Page loads quickly

### Automated Testing
```bash
# HTML validation
npx html-validate docs/index.html

# Lighthouse audit
npx lighthouse http://localhost:8000 --output html --output-path ./lighthouse-report.html

# Link checking
npx broken-link-checker http://localhost:8000
```

## 📞 Support

For documentation site issues:
- Create an issue in the main repository
- Tag with `documentation` label
- Provide specific details about the problem

## 🤝 Contributing

To contribute to the documentation:
1. Fork the repository
2. Create a feature branch
3. Make your changes in the `docs/` directory
4. Test locally
5. Submit a pull request

---

*This documentation site is part of the AttendanceX project. For the main application, see the root directory.*