#!/usr/bin/env node

/**
 * Script to merge individual Postman endpoint collections into a single comprehensive collection
 * Usage: node merge-collections.js
 */

const fs = require('fs');
const path = require('path');

// Read the main collection template
const mainCollection = JSON.parse(fs.readFileSync('Attendance-X-Complete-API-Collection.json', 'utf8'));

// List of endpoint collection files to merge
const endpointFiles = [
  'postman-auth-endpoints.json',
  'postman-user-endpoints.json', 
  'postman-tenant-endpoints.json',
  'postman-event-endpoints.json',
  'postman-attendance-endpoints.json',
  'postman-notification-endpoints.json',
  'postman-billing-endpoints.json',
  'postman-dunning-endpoints.json',
  'postman-grace-period-endpoints.json',
  'postman-promo-code-endpoints.json',
  'postman-public-endpoints.json',
  'postman-stripe-webhooks-endpoints.json',
  'postman-billing-webhooks-endpoints.json',
  'postman-report-endpoints.json',
  'postman-campaign-endpoints.json',
  'postman-branding-endpoints.json',
  'postman-resolution-endpoints.json',
  'postman-appointment-endpoints.json',
  'postman-integration-endpoints.json',
  'postman-qrcode-endpoints.json',
  'postman-system-endpoints.json'
];

console.log('🔄 Merging Postman collections...\n');

// Merge all endpoint collections
endpointFiles.forEach(filename => {
  try {
    if (fs.existsSync(filename)) {
      const endpointCollection = JSON.parse(fs.readFileSync(filename, 'utf8'));
      mainCollection.item.push(endpointCollection);
      console.log(`✅ Merged ${filename} (${endpointCollection.item ? endpointCollection.item.length : 0} endpoints)`);
    } else {
      console.log(`⚠️  Skipped ${filename} (file not found)`);
    }
  } catch (error) {
    console.error(`❌ Error merging ${filename}:`, error.message);
  }
});

// Write the complete collection
const outputFilename = 'Attendance-X-Complete-API-Collection.json';
fs.writeFileSync(outputFilename, JSON.stringify(mainCollection, null, 2));

console.log(`\n🎉 Complete collection created: ${outputFilename}`);
console.log(`📊 Total endpoint groups: ${mainCollection.item.length}`);

// Calculate total endpoints
let totalEndpoints = 0;
mainCollection.item.forEach(group => {
  if (group.item) {
    totalEndpoints += group.item.length;
  }
});

console.log(`🔗 Total API endpoints: ${totalEndpoints}`);
console.log(`\n📋 Collection includes:`);
mainCollection.item.forEach(group => {
  console.log(`   ${group.name} (${group.item ? group.item.length : 0} endpoints)`);
});

console.log(`\n📖 Import instructions:`);
console.log(`   1. Import ${outputFilename} into Postman`);
console.log(`   2. Import postman-environment.json as environment`);
console.log(`   3. Configure environment variables (baseUrl, testEmail, testPassword)`);
console.log(`   4. Run the Login request first to authenticate`);
console.log(`   5. Start testing all API endpoints!`);

console.log(`\n📚 Documentation: See README.md for detailed usage instructions`);
console.log(`\n✨ Ready for comprehensive API testing!`);