#!/usr/bin/env node

import crypto from 'crypto';
import { readFileSync } from 'fs';

const HMAC_SECRET = process.env.HMAC_SECRET || 'default-secret-key';

function generateHmacSignature(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node scripts/sign.js <json-string-or-file>');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/sign.js \'{"description":"Kitchen sink leak","propertyAddress":"123 Oak St"}\'');
    console.error('  node scripts/sign.js request.json');
    process.exit(1);
  }

  let jsonData;
  const input = args[0];

  try {
    // Try to read as file first
    if (input.endsWith('.json')) {
      jsonData = readFileSync(input, 'utf8');
    } else {
      jsonData = input;
    }

    // Validate JSON
    JSON.parse(jsonData);

    // Generate signature
    const signature = generateHmacSignature(jsonData, HMAC_SECRET);
    
    console.log('JSON Data:', jsonData);
    console.log('HMAC-SHA256 Signature:', `sha256=${signature}`);
    console.log('');
    console.log('Use this in the x-parco-signature header:');
    console.log(`x-parco-signature: sha256=${signature}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
