import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    return response;
  } finally {
    clearTimeout(id);
  }
}

async function test() {
  const OTX_BASE = 'https://otx.alienvault.com/api/v1';
  const apiKey = process.env.OTX_API_KEY;
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const url = `${OTX_BASE}/pulses/subscribed?modified_since=${since}&limit=50`;
  
  console.log('Testing fetchWithTimeout inside the application context...');
  console.log('Using API key:', apiKey ? apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5) : 'undefined');
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'X-OTX-API-KEY': apiKey }
    });
    console.log('Status:', res.status);
  } catch(e) {
    console.error('Error:', e);
  }
}

test();
