import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });
import { seedCyberAttacks } from './src/seeders/cyberAttacks.ts';

async function test() {
  console.log('Testing seedCyberAttacks...');
  try {
    await seedCyberAttacks();
  } catch(e) {
    console.error('Error:', e);
  }
}

test();
