#!/usr/bin/env node

/**
 * Test Notification Scheduler Manually
 * 
 * This script tests the notification system by sending notifications immediately
 * Usage: node scripts/testNotifications.js
 */

const notificationService = require('../src/services/notificationService');
const logger = require('../src/utils/logger');

async function testNotifications() {
  console.log('📲 Testing notification scheduler...\n');
  
  try {
    console.log('Sending batch notifications to all users...');
    
    const result = await notificationService.sendBatchNotifications();
    
    console.log('\n✅ Test completed!');
    console.log(`📤 Sent: ${result.sent}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`📊 Total: ${result.sent + result.failed}`);
    
    if (result.sent === 0) {
      console.log('\n⚠️  No notifications sent. Possible reasons:');
      console.log('   - No users have expo_push_token set');
      console.log('   - Users have notification_enabled = false');
      console.log('   - No quotes available in database');
    }
    
    return result;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testNotifications()
    .then(() => {
      console.log('\n✅ Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

module.exports = testNotifications;
