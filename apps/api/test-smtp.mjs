import 'dotenv/config';
import { emailService } from './dist/services/emailService.js';

async function test() {
  try {
    console.log('Testing SMTP connection...');
    const result = await emailService.verifyConnection();
    console.log('SMTP Connection:', result ? 'SUCCESS' : 'FAILED');
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

test();