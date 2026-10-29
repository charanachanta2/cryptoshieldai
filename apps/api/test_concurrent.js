const http = require('http');

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const options = {
      hostname: '127.0.0.1',
      port: 4001,
      path: '/api/v1' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: body });
      });
    });
    
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testConcurrent() {
  try {
    console.log('1. Logging in...');
    const login = await makeRequest('POST', '/auth/login', {
      email: 'test@example.com',
      password: 'TestPass123!'
    });
    console.log('Login:', login.status);
    if (login.status !== 200) {
      console.log('Login failed:', login.body);
      return;
    }
    
    const loginData = JSON.parse(login.body);
    const oldToken = loginData.refreshToken;
    
    console.log('\n2. Sending 5 concurrent refresh requests with SAME token...');
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(makeRequest('POST', '/auth/refresh', { refreshToken: oldToken }));
    }
    
    const results = await Promise.all(promises);
    
    console.log('\nResults:');
    let successCount = 0;
    let failCount = 0;
    let newToken = null;
    results.forEach((r, i) => {
      let parsed;
      try {
        parsed = JSON.parse(r.body);
      } catch {
        parsed = { error: { message: r.body } };
      }
      if (r.status === 200) {
        successCount++;
        try {
          const tokenPayload = JSON.parse(Buffer.from(parsed.refreshToken.split('.')[1], 'base64').toString());
          console.log(`  Request ${i+1}: SUCCESS (new jti: ${tokenPayload.jti})`);
          if (!newToken) newToken = parsed.refreshToken;
        } catch {
          console.log(`  Request ${i+1}: SUCCESS (new token received)`);
          if (!newToken) newToken = parsed.refreshToken;
        }
      } else {
        failCount++;
        console.log(`  Request ${i+1}: FAIL (${r.status}) - ${parsed.error?.message || parsed.error || 'Unknown error'}`);
      }
    });
    
    console.log(`\nSummary: ${successCount} succeeded, ${failCount} failed`);
    
    // Test the successful new token
    if (newToken) {
      console.log('\n3. Testing the successful new token (should work)...');
      const test = await makeRequest('POST', '/auth/refresh', { refreshToken: newToken });
      let parsed;
      try { parsed = JSON.parse(test.body); } catch { parsed = { error: { message: test.body } }; }
      console.log('Test new token:', test.status, parsed.error?.message || 'OK - token works');
      
      // Test new token again (rotation should work)
      if (test.status === 200) {
        const testData = JSON.parse(test.body);
        const newerToken = testData.refreshToken;
        console.log('\n4. Testing second rotation with new token (should work)...');
        const test2 = await makeRequest('POST', '/auth/refresh', { refreshToken: newerToken });
        let parsed2;
        try { parsed2 = JSON.parse(test2.body); } catch { parsed2 = { error: { message: test2.body } }; }
        console.log('Second rotation:', test2.status, parsed2.error?.message || 'OK - rotation chain works');
      }
    }
    
    // Test old token again (should fail)
    console.log('\n5. Testing old token again (should fail)...');
    const reuse = await makeRequest('POST', '/auth/refresh', { refreshToken: oldToken });
    let parsed;
    try { parsed = JSON.parse(reuse.body); } catch { parsed = { error: { message: reuse.body } }; }
    console.log('Old token reuse:', reuse.status, parsed.error?.message || 'OK');
    
  } catch (e) {
    console.error('Error:', e);
  }
}

testConcurrent();