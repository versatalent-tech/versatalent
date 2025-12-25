#!/usr/bin/env bun

/**
 * Stripe Setup Validation Script
 *
 * Run this to check if Stripe is configured correctly:
 * bun run scripts/check-stripe-setup.ts
 */

import Stripe from 'stripe';

const REQUIRED_ENV_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

console.log('🔍 Checking Stripe Setup...\n');

// Check environment variables
console.log('📝 Environment Variables:');
let allPresent = true;

for (const envVar of REQUIRED_ENV_VARS) {
  const value = process.env[envVar];

  if (!value) {
    console.log(`  ❌ ${envVar}: Missing`);
    allPresent = false;
  } else if (value.includes('your_') || value.includes('xxx')) {
    console.log(`  ⚠️  ${envVar}: Placeholder value (not configured)`);
    allPresent = false;
  } else {
    const masked = value.substring(0, 12) + '...' + value.substring(value.length - 4);
    console.log(`  ✅ ${envVar}: ${masked}`);
  }
}

if (!allPresent) {
  console.log('\n❌ Stripe configuration incomplete!');
  console.log('\n📖 Follow these steps:');
  console.log('   1. Get API keys from: https://dashboard.stripe.com/test/apikeys');
  console.log('   2. Add them to your .env file');
  console.log('   3. Restart your dev server');
  console.log('   4. Run this script again\n');
  console.log('📄 See STRIPE_ENV_SETUP.md for detailed instructions\n');
  process.exit(1);
}

// Test Stripe connection
console.log('\n🔌 Testing Stripe Connection:');

try {
  const secretKey = process.env.STRIPE_SECRET_KEY!;

  // Validate key format
  if (secretKey.startsWith('sk_test_')) {
    console.log('  ℹ️  Mode: Test Mode (good for development)');
  } else if (secretKey.startsWith('sk_live_')) {
    console.log('  ⚠️  Mode: Live Mode (be careful!)');
  } else {
    throw new Error('Invalid secret key format');
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia',
  });

  // Test API call
  console.log('  🔄 Testing API connection...');
  const balance = await stripe.balance.retrieve();

  console.log(`  ✅ Connection successful!`);
  console.log(`  💰 Account currency: ${balance.available[0]?.currency?.toUpperCase() || 'N/A'}`);

} catch (error: any) {
  console.log(`  ❌ Connection failed: ${error.message}`);
  console.log('\n📖 Troubleshooting:');
  console.log('   - Verify your secret key is correct');
  console.log('   - Check for extra spaces in .env');
  console.log('   - Ensure you copied the complete key from Stripe Dashboard\n');
  process.exit(1);
}

// Validate publishable key
console.log('\n🔑 Validating Publishable Key:');

const pubKey = process.env.STRIPE_PUBLISHABLE_KEY;
const nextPubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (pubKey !== nextPubKey) {
  console.log('  ⚠️  STRIPE_PUBLISHABLE_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY should match');
  console.log(`     STRIPE_PUBLISHABLE_KEY: ${pubKey?.substring(0, 20)}...`);
  console.log(`     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${nextPubKey?.substring(0, 20)}...`);
} else {
  console.log('  ✅ Publishable keys match');
}

// Success!
// Check webhook secret (optional for development, required for production)
console.log('\n🔔 Webhook Configuration:');

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  console.log('  ⚠️  STRIPE_WEBHOOK_SECRET: Not set (optional for development)');
  console.log('      For production, set this for reliable payment confirmation');
  console.log('      See WEBHOOK_SETUP_GUIDE.md for setup instructions');
} else if (webhookSecret.includes('whsec_')) {
  const masked = webhookSecret.substring(0, 10) + '...' + webhookSecret.substring(webhookSecret.length - 4);
  console.log(`  ✅ STRIPE_WEBHOOK_SECRET: ${masked}`);
} else {
  console.log('  ⚠️  STRIPE_WEBHOOK_SECRET: Invalid format (should start with whsec_)');
}

// Success summary
console.log('\n✅ Stripe Setup Complete!\n');

if (secretKey.startsWith('sk_test_')) {
  console.log('📍 Current Mode: TEST MODE');
  console.log('🎉 You can now:');
  console.log('   1. Start your dev server: bun run dev');
  console.log('   2. Open POS: http://localhost:3000/pos');
  console.log('   3. Test with card: 4242 4242 4242 4242\n');
  console.log('📖 Test Card Numbers:');
  console.log('   Success:     4242 4242 4242 4242');
  console.log('   Declined:    4000 0000 0000 0002');
  console.log('   3D Secure:   4000 0025 0000 3155\n');
  console.log('   Expiry: Any future date (e.g., 12/25)');
  console.log('   CVC: Any 3 digits (e.g., 123)\n');
} else {
  console.log('🚨 Current Mode: LIVE MODE');
  console.log('⚠️  WARNING: This will process REAL payments!\n');
  console.log('✅ Pre-flight Checklist:');
  console.log('   [ ] Stripe account fully verified');
  console.log('   [ ] Bank account connected');
  console.log('   [ ] Webhook endpoint configured');
  console.log('   [ ] STRIPE_WEBHOOK_SECRET set');
  console.log('   [ ] Tested with small real payment');
  console.log('   [ ] Staff trained on POS');
  console.log('   [ ] Monitoring in place\n');
  console.log('📚 See PRODUCTION_DEPLOYMENT_GUIDE.md before going live!\n');
}
