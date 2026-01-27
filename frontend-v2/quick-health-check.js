#!/usr/bin/env node

/**
 * Quick Health Check Script
 * Vérifie rapidement que les pages principales sont accessibles
 */

const https = require('https');

const PRODUCTION_URL = 'https://attendance-x.vercel.app';
const TIMEOUT = 10000; // 10 secondes

const pages = [
  { path: '/', name: 'Homepage' },
  { path: '/events', name: 'Events Discovery' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/auth/login', name: 'Login' },
  { path: '/auth/register', name: 'Register' },
];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function checkPage(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = https.get(url, { timeout: TIMEOUT }, (res) => {
      const duration = Date.now() - startTime;
      
      resolve({
        success: res.statusCode === 200,
        statusCode: res.statusCode,
        duration,
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout',
        duration: TIMEOUT,
      });
    });
  });
}

async function runHealthCheck() {
  console.log(`${colors.blue}🏥 AttendanceX Health Check${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  console.log(`Target: ${PRODUCTION_URL}\n`);

  const results = [];
  let totalDuration = 0;

  for (const page of pages) {
    const url = `${PRODUCTION_URL}${page.path}`;
    process.stdout.write(`Checking ${page.name.padEnd(20)} ... `);
    
    const result = await checkPage(url);
    results.push({ ...page, ...result });
    totalDuration += result.duration;

    if (result.success) {
      console.log(`${colors.green}✓ OK${colors.reset} (${result.duration}ms)`);
    } else {
      console.log(`${colors.red}✗ FAIL${colors.reset} (${result.statusCode || result.error})`);
    }
  }

  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  const avgDuration = Math.round(totalDuration / results.length);

  console.log(`\n📊 Summary:`);
  console.log(`   Total Pages: ${results.length}`);
  console.log(`   ${colors.green}✓ Passed: ${successCount}${colors.reset}`);
  console.log(`   ${colors.red}✗ Failed: ${failCount}${colors.reset}`);
  console.log(`   ⏱️  Avg Response: ${avgDuration}ms`);
  console.log(`   ⏱️  Total Time: ${totalDuration}ms`);

  if (failCount > 0) {
    console.log(`\n${colors.red}❌ Health check FAILED${colors.reset}`);
    console.log(`\nFailed pages:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.name}: ${r.statusCode || r.error}`);
    });
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ All systems operational!${colors.reset}`);
    
    // Performance warnings
    if (avgDuration > 2000) {
      console.log(`\n${colors.yellow}⚠️  Warning: Average response time is high (${avgDuration}ms)${colors.reset}`);
    }
    
    process.exit(0);
  }
}

// Run the health check
runHealthCheck().catch(error => {
  console.error(`${colors.red}Error running health check:${colors.reset}`, error);
  process.exit(1);
});
