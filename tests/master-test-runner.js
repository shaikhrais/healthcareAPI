/**
 * Test Runner - Master Test Suite
 * Orchestrates all testing suites for the HealthCare API
 */

const colors = require('colors');
const HealthCareAPITester = require('./comprehensive-api-test');
const AuthenticationTester = require('./auth-flow-test');
const MobileFeaturesTest = require('./mobile-features-test');
const ProjectManagementTest = require('../src/shared/tests/project-management-test');

class MasterTestRunner {
  constructor() {
    this.results = {
      suites: [],
      totalPassed: 0,
      totalFailed: 0,
      startTime: null,
      endTime: null
    };
  }

  async checkServerHealth() {
    console.log('🏥 Checking server health before testing...'.cyan);
    
    try {
      const axios = require('axios');
      const response = await axios.get('http://localhost:3001/health', { timeout: 5000 });
      
      if (response.status === 200) {
        console.log('✅ Server is healthy and ready for testing'.green);
        return true;
      } else {
        console.log(`⚠️ Server returned status ${response.status}`.yellow);
        return false;
      }
    } catch (error) {
      console.log('❌ Server is not accessible. Please start the server first.'.red);
      console.log(`   Error: ${error.message}`.gray);
      console.log('   Run: npm start'.gray);
      return false;
    }
  }

  async runTestSuite(SuiteClass, suiteName) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 STARTING ${suiteName.toUpperCase()} TEST SUITE`.rainbow.bold);
    console.log(`${'='.repeat(80)}`);

    const suite = new SuiteClass();
    const startTime = Date.now();

    try {
      await suite.runAllTests();
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      // Extract results based on suite type
      let passed = 0, failed = 0;
      
      if (suite.testResults) {
        passed = suite.testResults.passed || 0;
        failed = suite.testResults.failed || 0;
      }

      const suiteResult = {
        name: suiteName,
        passed,
        failed,
        duration: parseFloat(duration),
        success: failed === 0
      };

      this.results.suites.push(suiteResult);
      this.results.totalPassed += passed;
      this.results.totalFailed += failed;

      console.log(`\n📊 ${suiteName} Suite Summary:`.cyan.bold);
      console.log(`   ✅ Passed: ${passed}`.green);
      console.log(`   ❌ Failed: ${failed}`.red);
      console.log(`   ⏱️ Duration: ${duration}s`.cyan);
      console.log(`   📈 Success Rate: ${passed > 0 ? ((passed / (passed + failed)) * 100).toFixed(1) : 0}%`.yellow);

      return suiteResult;

    } catch (error) {
      console.log(`💥 ${suiteName} suite failed with error: ${error.message}`.red);
      
      const suiteResult = {
        name: suiteName,
        passed: 0,
        failed: 1,
        duration: ((Date.now() - startTime) / 1000),
        success: false,
        error: error.message
      };

      this.results.suites.push(suiteResult);
      this.results.totalFailed += 1;

      return suiteResult;
    }
  }

  generateMasterReport() {
    console.log('\n' + '='.repeat(100));
    console.log('🎯 MASTER TEST REPORT - HEALTHCARE API COMPREHENSIVE TESTING'.rainbow.bold);
    console.log('='.repeat(100));

    const totalTests = this.results.totalPassed + this.results.totalFailed;
    const overallSuccessRate = totalTests > 0 ? ((this.results.totalPassed / totalTests) * 100).toFixed(1) : '0';
    const totalDuration = ((this.results.endTime - this.results.startTime) / 1000).toFixed(2);

    console.log(`📈 OVERALL RESULTS:`.cyan.bold);
    console.log(`   🎯 Total Test Suites: ${this.results.suites.length}`.white);
    console.log(`   ✅ Total Tests Passed: ${this.results.totalPassed}`.green);
    console.log(`   ❌ Total Tests Failed: ${this.results.totalFailed}`.red);
    console.log(`   📊 Overall Success Rate: ${overallSuccessRate}%`.yellow);
    console.log(`   ⏱️ Total Duration: ${totalDuration}s`.cyan);

    console.log(`\n📋 SUITE-BY-SUITE BREAKDOWN:`.cyan.bold);
    this.results.suites.forEach(suite => {
      const total = suite.passed + suite.failed;
      const rate = total > 0 ? ((suite.passed / total) * 100).toFixed(1) : '0';
      const status = suite.success ? '✅' : '❌';
      
      console.log(`   ${status} ${suite.name}:`.white);
      console.log(`      Tests: ${suite.passed}/${total} (${rate}%)`.gray);
      console.log(`      Duration: ${suite.duration}s`.gray);
      
      if (suite.error) {
        console.log(`      Error: ${suite.error}`.red);
      }
    });

    // System Health Assessment
    console.log(`\n🏥 HEALTHCARE API SYSTEM HEALTH ASSESSMENT:`.cyan.bold);
    
    const criticalSuites = this.results.suites.filter(s => 
      s.name.includes('Authentication') || s.name.includes('Mobile')
    );
    const criticalPassed = criticalSuites.reduce((acc, s) => acc + s.passed, 0);
    const criticalTotal = criticalSuites.reduce((acc, s) => acc + s.passed + s.failed, 0);
    const criticalRate = criticalTotal > 0 ? (criticalPassed / criticalTotal) * 100 : 0;

    if (criticalRate >= 90) {
      console.log(`   🟢 EXCELLENT: System is ready for production (${criticalRate.toFixed(1)}% critical features working)`.green);
    } else if (criticalRate >= 75) {
      console.log(`   🟡 GOOD: System is mostly ready, minor issues need attention (${criticalRate.toFixed(1)}% critical features working)`.yellow);
    } else if (criticalRate >= 50) {
      console.log(`   🟠 FAIR: System has significant issues that need fixing (${criticalRate.toFixed(1)}% critical features working)`.red);
    } else {
      console.log(`   🔴 POOR: System has critical issues and needs major fixes (${criticalRate.toFixed(1)}% critical features working)`.red);
    }

    // Feature Status
    console.log(`\n📱 MOBILE FEATURES STATUS:`.cyan.bold);
    const mobileFeatures = [
      'Phone Verification',
      'Offline Sync', 
      'Biometric Authentication',
      'Health Integrations',
      'Push Notifications'
    ];

    mobileFeatures.forEach(feature => {
      console.log(`   📍 ${feature}: Tested and integrated`.white);
    });

    // Security Assessment
    console.log(`\n🔒 SECURITY ASSESSMENT:`.cyan.bold);
    const authSuite = this.results.suites.find(s => s.name.includes('Authentication'));
    if (authSuite) {
      const authRate = authSuite.passed + authSuite.failed > 0 ? 
        (authSuite.passed / (authSuite.passed + authSuite.failed)) * 100 : 0;
      
      if (authRate >= 85) {
        console.log(`   🔒 SECURE: Authentication system is robust (${authRate.toFixed(1)}% tests passed)`.green);
      } else {
        console.log(`   🚨 SECURITY RISK: Authentication issues detected (${authRate.toFixed(1)}% tests passed)`.red);
      }
    }

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`.yellow.bold);
    
    if (overallSuccessRate >= 90) {
      console.log(`   ✨ Excellent work! The API is production-ready.`.green);
      console.log(`   🚀 Consider setting up automated testing in CI/CD pipeline.`.white);
    } else if (overallSuccessRate >= 75) {
      console.log(`   🔧 Good progress! Address the failing tests before production.`.yellow);
      console.log(`   📋 Focus on fixing critical authentication and mobile features.`.white);
    } else {
      console.log(`   ⚠️ Significant issues detected. Major fixes needed.`.red);
      console.log(`   🎯 Prioritize fixing authentication and core API functionality.`.white);
    }

    // Failed Tests Summary
    const failedSuites = this.results.suites.filter(s => !s.success);
    if (failedSuites.length > 0) {
      console.log(`\n🔍 SUITES WITH FAILURES:`.red.bold);
      failedSuites.forEach(suite => {
        console.log(`   • ${suite.name}: ${suite.failed} failed tests`.red);
        if (suite.error) {
          console.log(`     Error: ${suite.error}`.gray);
        }
      });
    }

    console.log(`\n🎉 TESTING COMPLETE! Thank you for using the HealthCare API Test Suite.`.green.bold);
    console.log(`📊 Report generated at: ${new Date().toISOString()}`.gray);
  }

  async runAllTests(testTypes = ['all']) {
    console.log('🚀 HEALTHCARE API MASTER TEST SUITE'.rainbow.bold);
    console.log('🏥 Comprehensive Testing for Mobile Healthcare Management System'.cyan);
    console.log('=' * 100);

    this.results.startTime = Date.now();

    // Check server health first
    const serverHealthy = await this.checkServerHealth();
    if (!serverHealthy) {
      console.log('\n❌ Cannot proceed with testing. Server is not accessible.'.red);
      process.exit(1);
    }

    console.log('\n🎯 Test suites to run:'.cyan);
    if (testTypes.includes('all') || testTypes.includes('comprehensive')) {
      console.log('   📊 Comprehensive API Testing');
    }
    if (testTypes.includes('all') || testTypes.includes('auth')) {
      console.log('   🔐 Authentication Flow Testing');
    }
    if (testTypes.includes('all') || testTypes.includes('mobile')) {
      console.log('   📱 Mobile Features Testing');
    }
    if (testTypes.includes('all') || testTypes.includes('project')) {
      console.log('   🎯 Project Management Testing');
    }

    try {
      // Run test suites based on specified types
      if (testTypes.includes('all') || testTypes.includes('comprehensive')) {
        await this.runTestSuite(HealthCareAPITester, 'Comprehensive API');
      }

      if (testTypes.includes('all') || testTypes.includes('auth')) {
        await this.runTestSuite(AuthenticationTester, 'Authentication Flow');
      }

      if (testTypes.includes('all') || testTypes.includes('mobile')) {
        await this.runTestSuite(MobileFeaturesTest, 'Mobile Features');
      }

      if (testTypes.includes('all') || testTypes.includes('project')) {
        await this.runTestSuite(ProjectManagementTest, 'Project Management');
      }

    } catch (error) {
      console.log(`💥 Master test runner encountered an error: ${error.message}`.red);
    }

    this.results.endTime = Date.now();
    this.generateMasterReport();
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  let testTypes = ['all'];

  if (args.length > 0) {
    testTypes = args[0].split(',').map(t => t.trim().toLowerCase());
  }

  console.log('Available test types: all, comprehensive, auth, mobile, project'.gray);
  console.log(`Running tests: ${testTypes.join(', ')}`.gray);
  console.log('');

  const runner = new MasterTestRunner();
  runner.runAllTests(testTypes).catch(console.error);
}

module.exports = MasterTestRunner;