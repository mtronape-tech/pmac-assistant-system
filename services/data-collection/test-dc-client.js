#!/usr/bin/env node

/**
 * Простой тестовый клиент для Data Collection Service
 * Проверяет основные API endpoints
 */

import axios from 'axios';

const BASE_URL = process.env.DATA_COLLECTION_URL || 'http://localhost:3008';
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('🧪 Data Collection Service Test Client');
console.log(`📡 Connecting to: ${BASE_URL}`);
console.log('');

async function testHealthCheck() {
  console.log('1️⃣ Testing Health Check...');
  try {
    const response = await client.get('/health');
    console.log('✅ Health Check:', response.data.status);
    console.log('   Services:', JSON.stringify(response.data.services, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Health Check failed:', error.message);
    return false;
  }
}

async function testAPIInfo() {
  console.log('2️⃣ Testing API Info...');
  try {
    const response = await client.get('/api');
    console.log('✅ API Info:', response.data.service);
    console.log('   Version:', response.data.version);
    return true;
  } catch (error) {
    console.log('❌ API Info failed:', error.message);
    return false;
  }
}

async function testGetConfigurations() {
  console.log('3️⃣ Testing Get Configurations...');
  try {
    const response = await client.get('/api/configurations');
    console.log('✅ Configurations:', response.data.count, 'configs found');
    if (response.data.data.length > 0) {
      console.log('   First config:', response.data.data[0].name);
    }
    return true;
  } catch (error) {
    console.log('❌ Get Configurations failed:', error.message);
    return false;
  }
}

async function testCreateConfiguration() {
  console.log('4️⃣ Testing Create Configuration...');
  try {
    const config = {
      name: 'Test Variable Collection',
      type: 'variables',
      enabled: true,
      interval: 5000,
      batchSize: 10,
      timeout: 10000,
      retryAttempts: 2,
      retryDelay: 3000,
      variables: [
        {
          type: 'P',
          address: 1,
          name: 'TestPosition',
          description: 'Test position variable'
        },
        {
          type: 'Q',
          address: 1,
          name: 'TestVelocity',
          description: 'Test velocity variable'
        }
      ],
      metadata: {
        testClient: true,
        createdBy: 'test-client'
      }
    };

    const response = await client.post('/api/configurations', config);
    console.log('✅ Configuration created:', response.data.data.id);
    return response.data.data.id;
  } catch (error) {
    console.log('❌ Create Configuration failed:', error.message);
    if (error.response?.data?.errors) {
      console.log('   Validation errors:', error.response.data.errors);
    }
    return null;
  }
}

async function testGetCollectionTypes() {
  console.log('5️⃣ Testing Get Collection Types...');
  try {
    const response = await client.get('/api/collection-types');
    console.log('✅ Collection Types:', response.data.data.join(', '));
    return true;
  } catch (error) {
    console.log('❌ Get Collection Types failed:', error.message);
    return false;
  }
}

async function testStartCollection(configId) {
  if (!configId) {
    console.log('6️⃣ Skipping Start Collection (no config ID)');
    return false;
  }

  console.log('6️⃣ Testing Start Collection...');
  try {
    const response = await client.post('/api/collections/start', {
      configId,
      immediate: true
    });
    console.log('✅ Collection started:', response.data.data.jobId);
    return response.data.data.jobId;
  } catch (error) {
    console.log('❌ Start Collection failed:', error.message);
    return null;
  }
}

async function testGetJobs() {
  console.log('7️⃣ Testing Get Jobs...');
  try {
    const response = await client.get('/api/jobs?limit=5');
    console.log('✅ Jobs:', response.data.count, 'jobs found');
    if (response.data.data.length > 0) {
      const job = response.data.data[0];
      console.log(`   Latest: ${job.id} (${job.status}) - ${job.recordsCollected} records`);
    }
    return true;
  } catch (error) {
    console.log('❌ Get Jobs failed:', error.message);
    return false;
  }
}

async function testGetRunningJobs() {
  console.log('8️⃣ Testing Get Running Jobs...');
  try {
    const response = await client.get('/api/jobs/running');
    console.log('✅ Running Jobs:', response.data.count, 'jobs running');
    return true;
  } catch (error) {
    console.log('❌ Get Running Jobs failed:', error.message);
    return false;
  }
}

async function testGetStats() {
  console.log('9️⃣ Testing Get Stats...');
  try {
    const response = await client.get('/api/stats');
    console.log('✅ Stats retrieved');
    if (response.data.data.scheduler) {
      const stats = response.data.data.scheduler;
      console.log(`   Scheduler: ${stats.totalJobsScheduled} total, ${stats.activeJobs} active`);
    }
    return true;
  } catch (error) {
    console.log('❌ Get Stats failed:', error.message);
    return false;
  }
}

async function testDeleteConfiguration(configId) {
  if (!configId) {
    console.log('🔟 Skipping Delete Configuration (no config ID)');
    return false;
  }

  console.log('🔟 Testing Delete Configuration...');
  try {
    const response = await client.delete(`/api/configurations/${configId}`);
    console.log('✅ Configuration deleted');
    return true;
  } catch (error) {
    console.log('❌ Delete Configuration failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Starting Data Collection Service tests...\n');
  
  let passed = 0;
  let total = 0;
  let configId = null;

  // Test 1: Health Check
  total++;
  if (await testHealthCheck()) passed++;
  console.log('');

  // Test 2: API Info
  total++;
  if (await testAPIInfo()) passed++;
  console.log('');

  // Test 3: Get Configurations
  total++;
  if (await testGetConfigurations()) passed++;
  console.log('');

  // Test 4: Create Configuration
  total++;
  configId = await testCreateConfiguration();
  if (configId) passed++;
  console.log('');

  // Test 5: Get Collection Types
  total++;
  if (await testGetCollectionTypes()) passed++;
  console.log('');

  // Test 6: Start Collection
  total++;
  const jobId = await testStartCollection(configId);
  if (jobId) passed++;
  console.log('');

  // Wait a bit for job to process
  if (jobId) {
    console.log('⏳ Waiting 3 seconds for job to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('');
  }

  // Test 7: Get Jobs
  total++;
  if (await testGetJobs()) passed++;
  console.log('');

  // Test 8: Get Running Jobs
  total++;
  if (await testGetRunningJobs()) passed++;
  console.log('');

  // Test 9: Get Stats
  total++;
  if (await testGetStats()) passed++;
  console.log('');

  // Test 10: Delete Configuration
  total++;
  if (await testDeleteConfiguration(configId)) passed++;
  console.log('');

  // Summary
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${passed}/${total} tests`);
  console.log(`❌ Failed: ${total - passed}/${total} tests`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Data Collection Service is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the service status and logs.');
  }

  process.exit(passed === total ? 0 : 1);
}

// Запуск тестов
runTests().catch(error => {
  console.error('💥 Test runner crashed:', error.message);
  process.exit(1);
});
