/**
 * Load Testing Utility
 * Comprehensive load testing for critical API endpoints
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class LoadTester {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.results = [];
    this.concurrentUsers = 0;
    this.maxConcurrentUsers = 0;
    
    this.testScenarios = {
      // Authentication scenarios
      auth: {
        name: 'Authentication Load Test',
        requests: [
          { method: 'POST', path: '/api/auth/login', weight: 30 },
          { method: 'POST', path: '/api/auth/register', weight: 10 },
          { method: 'GET', path: '/api/auth/me', weight: 20 },
        ]
      },
      
      // Appointment management scenarios
      appointments: {
        name: 'Appointment Management Load Test',
        requests: [
          { method: 'GET', path: '/api/appointments', weight: 40 },
          { method: 'POST', path: '/api/appointments', weight: 20 },
          { method: 'PUT', path: '/api/appointments/:id', weight: 15 },
          { method: 'GET', path: '/api/appointments/:id', weight: 25 },
        ]
      },
      
      // Schedule scenarios
      schedule: {
        name: 'Schedule Load Test',
        requests: [
          { method: 'GET', path: '/api/schedule', weight: 50 },
          { method: 'GET', path: '/api/schedule/availability', weight: 30 },
          { method: 'PUT', path: '/api/schedule/:id', weight: 20 },
        ]
      },
      
      // Patient management scenarios
      patients: {
        name: 'Patient Management Load Test',
        requests: [
          { method: 'GET', path: '/api/patients', weight: 35 },
          { method: 'POST', path: '/api/patients', weight: 15 },
          { method: 'GET', path: '/api/patients/:id', weight: 30 },
          { method: 'PUT', path: '/api/patients/:id', weight: 20 },
        ]
      },
      
      // Public API scenarios (no auth required)
      public: {
        name: 'Public API Load Test',
        requests: [
          { method: 'GET', path: '/api/public/treatments', weight: 40 },
          { method: 'GET', path: '/api/public/practitioners', weight: 30 },
          { method: 'GET', path: '/api/public/availability', weight: 30 },
        ]
      },
    };
  }

  /**
   * Generate test data for requests
   */
  generateTestData(path, method) {
    const testData = {
      // Authentication data
      '/api/auth/login': {
        email: `test${Math.floor(Math.random() * 1000)}@example.com`,
        password: 'TestPassword123!'
      },
      '/api/auth/register': {
        name: `Test User ${Math.floor(Math.random() * 1000)}`,
        email: `newuser${Math.floor(Math.random() * 10000)}@example.com`,
        password: 'TestPassword123!',
        role: 'patient'
      },
      
      // Appointment data
      '/api/appointments': method === 'POST' ? {
        practitionerId: '507f1f77bcf86cd799439011',
        patientId: '507f1f77bcf86cd799439012',
        treatmentId: '507f1f77bcf86cd799439013',
        date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 30,
        notes: 'Load test appointment'
      } : undefined,
      
      // Patient data
      '/api/patients': method === 'POST' ? {
        name: `Load Test Patient ${Math.floor(Math.random() * 1000)}`,
        email: `patient${Math.floor(Math.random() * 10000)}@example.com`,
        phone: `+1555${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        dateOfBirth: '1990-01-01',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345'
        }
      } : undefined
    };

    return testData[path] || {};
  }

  /**
   * Replace path parameters with test IDs
   */
  resolvePath(path) {
    const testIds = {
      ':id': '507f1f77bcf86cd799439011',
      ':appointmentId': '507f1f77bcf86cd799439012',
      ':patientId': '507f1f77bcf86cd799439013',
      ':practitionerId': '507f1f77bcf86cd799439014',
    };

    let resolvedPath = path;
    Object.entries(testIds).forEach(([param, id]) => {
      resolvedPath = resolvedPath.replace(param, id);
    });

    return resolvedPath;
  }

  /**
   * Execute a single HTTP request
   */
  async executeRequest(request, authToken = null) {
    const startTime = Date.now();
    const resolvedPath = this.resolvePath(request.path);
    const url = `${this.baseURL}${resolvedPath}`;
    
    const config = {
      method: request.method.toLowerCase(),
      url,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LoadTester/1.0',
      },
    };

    // Add authentication if provided
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    // Add request data for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      config.data = this.generateTestData(request.path, request.method);
    }

    try {
      const response = await axios(config);
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        status: response.status,
        responseTime,
        dataSize: JSON.stringify(response.data).length,
        path: request.path,
        method: request.method,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        status: error.response?.status || 0,
        responseTime,
        error: error.message,
        path: request.path,
        method: request.method,
      };
    }
  }

  /**
   * Simulate a user session
   */
  async simulateUser(scenario, duration = 60000, authToken = null) {
    const sessionResults = [];
    const startTime = Date.now();
    
    this.concurrentUsers++;
    this.maxConcurrentUsers = Math.max(this.maxConcurrentUsers, this.concurrentUsers);

    try {
      while (Date.now() - startTime < duration) {
        // Select random request based on weights
        const totalWeight = scenario.requests.reduce((sum, req) => sum + req.weight, 0);
        const randomWeight = Math.random() * totalWeight;
        
        let currentWeight = 0;
        let selectedRequest = null;
        
        for (const request of scenario.requests) {
          currentWeight += request.weight;
          if (randomWeight <= currentWeight) {
            selectedRequest = request;
            break;
          }
        }

        if (selectedRequest) {
          const result = await this.executeRequest(selectedRequest, authToken);
          sessionResults.push(result);
          
          // Random delay between requests (0.1 to 2 seconds)
          const delay = Math.random() * 1900 + 100;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } finally {
      this.concurrentUsers--;
    }

    return sessionResults;
  }

  /**
   * Run load test for a specific scenario
   */
  async runScenario(scenarioName, options = {}) {
    const {
      users = 10,
      duration = 60000, // 1 minute
      rampUp = 10000,   // 10 seconds
      authToken = null,
    } = options;

    const scenario = this.testScenarios[scenarioName];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }

    console.log(`\n🚀 Starting load test: ${scenario.name}`);
    console.log(`👥 Users: ${users}`);
    console.log(`⏱️  Duration: ${duration / 1000}s`);
    console.log(`📈 Ramp-up: ${rampUp / 1000}s`);

    const testResults = [];
    const userPromises = [];
    
    // Ramp up users gradually
    for (let i = 0; i < users; i++) {
      const delay = (i / users) * rampUp;
      
      const userPromise = new Promise(async (resolve) => {
        await new Promise(r => setTimeout(r, delay));
        const results = await this.simulateUser(scenario, duration, authToken);
        resolve(results);
      });
      
      userPromises.push(userPromise);
    }

    // Wait for all users to complete
    const allResults = await Promise.all(userPromises);
    
    // Flatten results
    allResults.forEach(userResults => {
      testResults.push(...userResults);
    });

    // Calculate statistics
    const stats = this.calculateStatistics(testResults, scenario.name);
    
    return {
      scenario: scenario.name,
      configuration: { users, duration, rampUp },
      results: testResults,
      statistics: stats,
    };
  }

  /**
   * Calculate performance statistics
   */
  calculateStatistics(results, scenarioName) {
    if (results.length === 0) {
      return { error: 'No results to analyze' };
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const responseTimes = successful.map(r => r.responseTime);
    
    // Sort for percentile calculations
    responseTimes.sort((a, b) => a - b);

    const percentile = (p) => {
      const index = Math.ceil((p / 100) * responseTimes.length) - 1;
      return responseTimes[index] || 0;
    };

    const totalDataTransferred = results.reduce((sum, r) => sum + (r.dataSize || 0), 0);
    const testDuration = Math.max(...results.map(r => r.responseTime)) / 1000;
    
    return {
      scenario: scenarioName,
      totalRequests: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: `${((successful.length / results.length) * 100).toFixed(2)}%`,
      errorRate: `${((failed.length / results.length) * 100).toFixed(2)}%`,
      
      responseTime: {
        min: Math.min(...responseTimes) || 0,
        max: Math.max(...responseTimes) || 0,
        average: Math.round(responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length) || 0,
        median: percentile(50),
        p90: percentile(90),
        p95: percentile(95),
        p99: percentile(99),
      },
      
      throughput: {
        requestsPerSecond: (results.length / testDuration).toFixed(2),
        dataPerSecond: `${(totalDataTransferred / testDuration / 1024).toFixed(2)} KB/s`,
      },
      
      concurrency: {
        maxConcurrentUsers: this.maxConcurrentUsers,
      },
      
      errors: this.analyzeErrors(failed),
    };
  }

  /**
   * Analyze error patterns
   */
  analyzeErrors(failures) {
    const errorStats = {};
    
    failures.forEach(failure => {
      const key = `${failure.status} - ${failure.error}`;
      errorStats[key] = (errorStats[key] || 0) + 1;
    });

    return Object.entries(errorStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 errors
      .map(([error, count]) => ({ error, count }));
  }

  /**
   * Run comprehensive load test suite
   */
  async runFullSuite(options = {}) {
    const {
      scenarios = Object.keys(this.testScenarios),
      users = 10,
      duration = 60000,
      rampUp = 10000,
    } = options;

    console.log('\n🧪 Starting comprehensive load test suite...\n');

    const suiteResults = [];
    
    for (const scenarioName of scenarios) {
      try {
        const result = await this.runScenario(scenarioName, {
          users,
          duration,
          rampUp,
        });
        
        suiteResults.push(result);
        
        // Print summary
        console.log(`✅ ${result.scenario}:`);
        console.log(`   📊 ${result.statistics.totalRequests} requests`);
        console.log(`   ✅ ${result.statistics.successRate} success rate`);
        console.log(`   ⚡ ${result.statistics.responseTime.average}ms avg response`);
        console.log(`   🚀 ${result.statistics.throughput.requestsPerSecond} req/s`);
        
        // Wait between scenarios
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error(`❌ Failed to run scenario ${scenarioName}:`, error.message);
        suiteResults.push({
          scenario: scenarioName,
          error: error.message,
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      configuration: options,
      results: suiteResults,
      summary: this.generateSuiteSummary(suiteResults),
    };
  }

  /**
   * Generate summary of test suite results
   */
  generateSuiteSummary(results) {
    const validResults = results.filter(r => !r.error);
    
    if (validResults.length === 0) {
      return { error: 'No successful test scenarios' };
    }

    const totalRequests = validResults.reduce((sum, r) => sum + r.statistics.totalRequests, 0);
    const totalSuccessful = validResults.reduce((sum, r) => sum + r.statistics.successful, 0);
    const avgResponseTime = validResults.reduce((sum, r) => sum + r.statistics.responseTime.average, 0) / validResults.length;
    const avgThroughput = validResults.reduce((sum, r) => sum + parseFloat(r.statistics.throughput.requestsPerSecond), 0) / validResults.length;

    return {
      totalScenarios: results.length,
      successfulScenarios: validResults.length,
      failedScenarios: results.length - validResults.length,
      overallStats: {
        totalRequests,
        successRate: `${((totalSuccessful / totalRequests) * 100).toFixed(2)}%`,
        averageResponseTime: `${Math.round(avgResponseTime)}ms`,
        averageThroughput: `${avgThroughput.toFixed(2)} req/s`,
      },
    };
  }

  /**
   * Save test results to file
   */
  async saveResults(results, filename = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `load-test-results-${timestamp}.json`;
    const filepath = path.join(process.cwd(), 'reports', filename || defaultFilename);
    
    try {
      // Ensure reports directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      
      // Write results to file
      await fs.writeFile(filepath, JSON.stringify(results, null, 2));
      
      console.log(`\n📄 Results saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('Failed to save results:', error.message);
      return null;
    }
  }

  /**
   * Generate HTML report
   */
  async generateReport(results, filename = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `load-test-report-${timestamp}.html`;
    const filepath = path.join(process.cwd(), 'reports', filename || defaultFilename);
    
    const html = this.generateReportHTML(results);
    
    try {
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, html);
      
      console.log(`\n📊 HTML report generated: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('Failed to generate HTML report:', error.message);
      return null;
    }
  }

  /**
   * Generate HTML report content
   */
  generateReportHTML(results) {
    const timestamp = results.timestamp || new Date().toISOString();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HealthCare Load Test Report - ${timestamp}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2 { color: #333; margin-top: 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .stat-label { font-size: 0.9em; color: #666; margin-top: 5px; }
        .scenario { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 6px; }
        .scenario h3 { margin-top: 0; color: #495057; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
        .metric { background: #e9ecef; padding: 10px; border-radius: 4px; text-align: center; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 HealthCare Load Test Report</h1>
        <p class="timestamp">Generated: ${timestamp}</p>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">${results.summary?.totalScenarios || 0}</div>
                <div class="stat-label">Total Scenarios</div>
            </div>
            <div class="stat-card">
                <div class="stat-value ${results.summary?.overallStats?.successRate === '100.00%' ? 'success' : 'warning'}">
                    ${results.summary?.overallStats?.successRate || 'N/A'}
                </div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${results.summary?.overallStats?.averageResponseTime || 'N/A'}</div>
                <div class="stat-label">Avg Response Time</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${results.summary?.overallStats?.averageThroughput || 'N/A'}</div>
                <div class="stat-label">Avg Throughput</div>
            </div>
        </div>

        ${(results.results || []).map(scenario => `
            <div class="scenario">
                <h3>${scenario.scenario}</h3>
                ${scenario.error ? `
                    <p class="error">❌ Test failed: ${scenario.error}</p>
                ` : `
                    <div class="metrics">
                        <div class="metric">
                            <strong>${scenario.statistics.totalRequests}</strong><br>
                            <small>Total Requests</small>
                        </div>
                        <div class="metric">
                            <strong class="${scenario.statistics.successRate === '100.00%' ? 'success' : 'warning'}">
                                ${scenario.statistics.successRate}
                            </strong><br>
                            <small>Success Rate</small>
                        </div>
                        <div class="metric">
                            <strong>${scenario.statistics.responseTime.average}ms</strong><br>
                            <small>Avg Response</small>
                        </div>
                        <div class="metric">
                            <strong>${scenario.statistics.responseTime.p95}ms</strong><br>
                            <small>95th Percentile</small>
                        </div>
                        <div class="metric">
                            <strong>${scenario.statistics.throughput.requestsPerSecond}</strong><br>
                            <small>Requests/sec</small>
                        </div>
                        <div class="metric">
                            <strong>${scenario.statistics.concurrency.maxConcurrentUsers}</strong><br>
                            <small>Max Concurrent</small>
                        </div>
                    </div>
                `}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }
}

module.exports = LoadTester;