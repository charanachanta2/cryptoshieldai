const { MongoClient } = require('mongodb');

async function setup() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/cryptoshield');
  await client.connect();
  const db = client.db('cryptoshield');
  // Update a user to be active and verified with known password
  const argon2 = require('argon2');
  const hash = await argon2.hash('TestPass123!', { type: argon2.argon2id, memoryCost: 2**16, timeCost: 3, parallelism: 1 });
  await db.collection('users').updateOne(
    { email: 'test@example.com' },
    { $set: { passwordHash: hash, status: 'active', emailVerified: true, verificationToken: '', verificationExpiresAt: '' } }
  );
  console.log('Updated test@example.com');
  await client.close();
}

setup().catch(console.error);