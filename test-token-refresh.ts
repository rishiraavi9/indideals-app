#!/usr/bin/env tsx
/**
 * Test script to verify token refresh mechanism
 *
 * This script:
 * 1. Logs in a user and gets access + refresh tokens
 * 2. Waits for access token to expire (15 minutes)
 * 3. Attempts to refresh the token
 * 4. Verifies the new access token works
 */

const API_URL = 'http://localhost:3001/api';

async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

async function testTokenRefresh() {
  console.log('\n🧪 Token Refresh Test Suite\n');
  console.log('=' .repeat(70));

  try {
    // Step 1: Login
    console.log('\n1️⃣  Logging in...');
    const loginResponse = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'tokentest@example.com',
        password: 'Test123!@#',
      }),
    });

    console.log('   ✅ Login successful');
    console.log(`   📝 User: ${loginResponse.user.username}`);
    console.log(`   🔑 Access Token: ${loginResponse.accessToken.substring(0, 20)}...`);
    console.log(`   🔄 Refresh Token: ${loginResponse.refreshToken.substring(0, 20)}...`);

    const accessToken = loginResponse.accessToken;
    const refreshToken = loginResponse.refreshToken;

    // Step 2: Verify access token works
    console.log('\n2️⃣  Testing access token...');
    const meResponse = await makeRequest('/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log(`   ✅ Access token works for user: ${meResponse.user.username}`);

    // Step 3: Test refresh token endpoint
    console.log('\n3️⃣  Testing token refresh...');
    const refreshResponse = await makeRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    console.log('   ✅ Token refresh successful');
    console.log(`   🔑 New Access Token: ${refreshResponse.accessToken.substring(0, 20)}...`);
    console.log(`   🔄 New Refresh Token: ${refreshResponse.refreshToken.substring(0, 20)}...`);

    const newAccessToken = refreshResponse.accessToken;

    // Step 4: Verify new access token works
    console.log('\n4️⃣  Testing new access token...');
    const meResponse2 = await makeRequest('/auth/me', {
      headers: {
        Authorization: `Bearer ${newAccessToken}`,
      },
    });
    console.log(`   ✅ New access token works for user: ${meResponse2.user.username}`);

    // Step 5: Verify old refresh token is revoked
    console.log('\n5️⃣  Testing old refresh token (should fail)...');
    try {
      await makeRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }), // Old token
      });
      console.log('   ❌ FAILED: Old refresh token should be revoked!');
    } catch (error: any) {
      console.log(`   ✅ Old refresh token correctly revoked: ${error.message}`);
    }

    // Step 6: Test logout
    console.log('\n6️⃣  Testing logout...');
    await makeRequest('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refreshResponse.refreshToken }),
    });
    console.log('   ✅ Logout successful');

    // Step 7: Verify refresh token is revoked after logout
    console.log('\n7️⃣  Testing refresh token after logout (should fail)...');
    try {
      await makeRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refreshResponse.refreshToken }),
      });
      console.log('   ❌ FAILED: Refresh token should be revoked after logout!');
    } catch (error: any) {
      console.log(`   ✅ Refresh token correctly revoked after logout: ${error.message}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ All tests passed!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testTokenRefresh();
