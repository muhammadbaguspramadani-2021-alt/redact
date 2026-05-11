
import fs from 'fs';
import path from 'path';

async function testAnchor() {
  const hash = 'a'.repeat(64); // mock hash for testing
  const url = 'http://localhost:3000/api/anchor';
  
  console.log('Testing Anchor API...');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash })
    });
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('API Call failed (make sure the dev server is running at localhost:3000):', err.message);
  }
}

testAnchor().catch(console.error);
