
const { logger } = require('../utils/logger');
/**
 * Claim Scrubbing Service
 *
 * Validates insurance claims and detects/corrects errors before submission
 */

const {
  allRules,
  SeverityLevel,
  RuleCategory,
  getRulesByCategory,
  getRulesBySeverity,
  getAutoFixableRules,
} = require('../utils/claimValidationRules');
/**
 * Scrubbing Result Status
 */
const ScrubStatus = {
  PASS: 'pass', // No errors, ready to submit
  PASS_WITH_WARNINGS: 'pass_with_warnings', // Warnings only, can submit
  FAIL: 'fail', // Errors found, cannot submit
  FIXED: 'fixed', // Errors auto-fixed, review recommended
};

/**
 * Claim Scrubber Service
 */
class ClaimScrubber {
  constructor() {
    this.rules = allRules;
  }

  /**
   * Scrub a claim
   */
  async scrub(claim, options = {}) {
    const {
      autoFix = false,
      categories = null, // null = all categories
      skipWarnings = false,
    } = options;

    const startTime = Date.now();
    const results = {
      claimId: claim._id || claim.id,
      status: ScrubStatus.PASS,
      errors: [],
      warnings: [],
      info: [],
      fixedIssues: [],
      summary: {
        totalChecks: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        fixedCount: 0,
        autoFixableCount: 0,
      },
      categories: {},
      timestamp: new Date().toISOString(),
      duration: 0,
    };

    try {
      // Filter rules by categories if specified
      let rulesToRun = this.rules;
      if (categories && Array.isArray(categories)) {
        rulesToRun = this.rules.filter((rule) => categories.includes(rule.category));
      }

      results.summary.totalChecks = rulesToRun.length;

      // Run all validation rules
      for (const rule of rulesToRun) {
        const result = await rule.execute(claim);

        if (!result.valid && !result.error) {
          // Validation failed
          const issue = {
            ...result,
            timestamp: new Date().toISOString(),
          };

          // Categorize by severity
          if (result.severity === SeverityLevel.ERROR) {
            results.errors.push(issue);
            results.summary.errorCount += 1;

            if (issue.autoFixable) {
              results.summary.autoFixableCount += 1;
            }
          } else if (result.severity === SeverityLevel.WARNING) {
            if (!skipWarnings) {
              results.warnings.push(issue);
              results.summary.warningCount += 1;
            }
          } else if (result.severity === SeverityLevel.INFO) {
            results.info.push(issue);
            results.summary.infoCount += 1;
          }

          // Track by category
          if (!results.categories[result.category]) {
            results.categories[result.category] = {
              errors: 0,
              warnings: 0,
              info: 0,
            };
          }

          if (result.severity === SeverityLevel.ERROR) {
            results.categories[result.category].errors += 1;
          } else if (result.severity === SeverityLevel.WARNING) {
            results.categories[result.category].warnings += 1;
          } else {
            results.categories[result.category].info += 1;
          }

          // Auto-fix if enabled
          if (autoFix && issue.autoFixable) {
            const fixResult = await this.fixIssue(claim, rule);

            if (fixResult.fixed) {
              results.fixedIssues.push({
                ruleId: rule.id,
                ruleName: rule.name,
                changes: fixResult.changes,
                message: fixResult.message,
              });
              results.summary.fixedCount += 1;

              // Remove from errors since it's fixed
              const errorIndex = results.errors.findIndex((e) => e.ruleId === rule.id);
              if (errorIndex > -1) {
                results.errors.splice(errorIndex, 1);
                results.summary.errorCount -= 1;
              }
            }
          }
        }
      }

      // Determine overall status
      results.status = this.determineStatus(results);

      // Calculate duration
      results.duration = Date.now() - startTime;

      // Log scrubbing result
      logger.info('Claim scrubbed', {
        claimId: results.claimId,
        status: results.status,
        errorCount: results.summary.errorCount,
        warningCount: results.summary.warningCount,
        fixedCount: results.summary.fixedCount,
        duration: `${results.duration}ms`,
      });

      return results;
    } catch (error) {
      logger.error('Claim scrubbing failed', {
        claimId: claim._id || claim.id,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Batch scrub multiple claims
   */
  async scrubBatch(claims, options = {}) {
    const { concurrency = 5 } = options;
    const results = [];

    // Process in batches
    for (let i = 0; i < claims.length; i += concurrency) {
      const batch = claims.slice(i, i + concurrency);

      const batchResults = await Promise.all(batch.map((claim) => this.scrub(claim, options)));

      results.push(...batchResults);
    }

    // Calculate aggregate statistics
    const summary = {
      totalClaims: claims.length,
      passed: results.filter((r) => r.status === ScrubStatus.PASS).length,
      passedWithWarnings: results.filter((r) => r.status === ScrubStatus.PASS_WITH_WARNINGS).length,
      failed: results.filter((r) => r.status === ScrubStatus.FAIL).length,
      fixed: results.filter((r) => r.status === ScrubStatus.FIXED).length,
      totalErrors: results.reduce((sum, r) => sum + r.summary.errorCount, 0),
      totalWarnings: results.reduce((sum, r) => sum + r.summary.warningCount, 0),
      totalFixed: results.reduce((sum, r) => sum + r.summary.fixedCount, 0),
    };

    return {
      results,
      summary,
    };
  }

  /**
   * Fix a specific issue
   */
  async fixIssue(claim, rule) {
    try {
      return await rule.autoFix(claim);
    } catch (error) {
      logger.error('Auto-fix failed', {
        ruleId: rule.id,
        error: error.message,
      });

      return {
        fixed: false,
        message: `Auto-fix failed: ${error.message}`,
      };
    }
  }

  /**
   * Auto-fix all fixable issues
   */
  async autoFixAll(claim) {
    const scrubResult = await this.scrub(claim, { autoFix: false });
    const fixableIssues = scrubResult.errors.filter((e) => e.autoFixable);

    if (fixableIssues.length === 0) {
      return {
        fixed: false,
        message: 'No auto-fixable issues found',
        fixedCount: 0,
      };
    }

    const fixes = [];

    for (const issue of fixableIssues) {
      const rule = this.rules.find((r) => r.id === issue.ruleId);
      if (rule) {
        const fixResult = await this.fixIssue(claim, rule);
        if (fixResult.fixed) {
          fixes.push({
            ruleId: rule.id,
            ruleName: rule.name,
            ...fixResult,
          });
        }
      }
    }

    return {
      fixed: fixes.length > 0,
      fixedCount: fixes.length,
      fixes,
      message: `Auto-fixed ${fixes.length} of ${fixableIssues.length} issues`,
    };
  }

  /**
   * Determine overall scrubbing status
   */
  determineStatus(results) {
    if (results.summary.errorCount > 0) {
      return ScrubStatus.FAIL;
    }

    if (results.summary.fixedCount > 0) {
      return ScrubStatus.FIXED;
    }

    if (results.summary.warningCount > 0) {
      return ScrubStatus.PASS_WITH_WARNINGS;
    }

    return ScrubStatus.PASS;
  }

  /**
   * Validate specific categories
   */
  async validateCategory(claim, category) {
    return this.scrub(claim, { categories: [category] });
  }

  /**
   * Get scrubbing summary
   */
  getSummary(scrubResult) {
    return {
      status: scrubResult.status,
      canSubmit: scrubResult.status !== ScrubStatus.FAIL,
      reviewRequired:
        scrubResult.status === ScrubStatus.FIXED ||
        scrubResult.status === ScrubStatus.PASS_WITH_WARNINGS,
      errorCount: scrubResult.summary.errorCount,
      warningCount: scrubResult.summary.warningCount,
      fixedCount: scrubResult.summary.fixedCount,
      autoFixableCount: scrubResult.summary.autoFixableCount,
      topIssues: this.getTopIssues(scrubResult),
      recommendations: this.getRecommendations(scrubResult),
    };
  }

  /**
   * Get top issues by category
   */
  getTopIssues(scrubResult) {
    const categoryIssues = Object.entries(scrubResult.categories)
      .map(([category, counts]) => ({
        category,
        total: counts.errors + counts.warnings,
        errors: counts.errors,
        warnings: counts.warnings,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return categoryIssues;
  }

  /**
   * Get recommendations
   */
  getRecommendations(scrubResult) {
    const recommendations = [];

    if (scrubResult.summary.autoFixableCount > 0) {
      recommendations.push({
        priority: 'high',
        action: 'auto_fix',
        message: `${scrubResult.summary.autoFixableCount} issues can be automatically fixed`,
        details: 'Run auto-fix to correct these issues',
      });
    }

    if (scrubResult.summary.errorCount > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'review_errors',
        message: `${scrubResult.summary.errorCount} errors must be corrected before submission`,
        details: 'Review and correct all error-level issues',
      });
    }

    if (scrubResult.summary.warningCount > 5) {
      recommendations.push({
        priority: 'medium',
        action: 'review_warnings',
        message: `${scrubResult.summary.warningCount} warnings found`,
        details: 'Review warnings to improve claim quality',
      });
    }

    // Category-specific recommendations
    const { categories } = scrubResult;

    if (categories[RuleCategory.INSURANCE_INFO]?.errors > 0) {
      recommendations.push({
        priority: 'high',
        action: 'verify_insurance',
        message: 'Insurance information has errors',
        details: 'Verify insurance eligibility and coverage details',
      });
    }

    if (categories[RuleCategory.DIAGNOSIS]?.errors > 0) {
      recommendations.push({
        priority: 'high',
        action: 'review_diagnosis',
        message: 'Diagnosis codes have errors',
        details: 'Verify all diagnosis codes are correct and properly formatted',
      });
    }

    if (categories[RuleCategory.PROCEDURE]?.errors > 0) {
      recommendations.push({
        priority: 'high',
        action: 'review_procedures',
        message: 'Procedure codes have errors',
        details: 'Verify CPT/HCPCS codes and diagnosis pointers',
      });
    }

    return recommendations;
  }

  /**
   * Generate detailed report
   */
  generateReport(scrubResult) {
    const report = {
      header: {
        claimId: scrubResult.claimId,
        status: scrubResult.status,
        timestamp: scrubResult.timestamp,
        duration: `${scrubResult.duration}ms`,
      },
      summary: this.getSummary(scrubResult),
      issues: {
        errors: scrubResult.errors,
        warnings: scrubResult.warnings,
        info: scrubResult.info,
      },
      fixes: scrubResult.fixedIssues,
      categories: scrubResult.categories,
      statistics: scrubResult.summary,
    };

    return report;
  }

  /**
   * Compare claims before and after scrubbing
   */
  compareClaims(originalClaim, scrubbedClaim) {
    const changes = [];

    // Deep comparison (simplified)
    const compare = (obj1, obj2, path = '') => {
      for (const key in obj2) {
        const newPath = path ? `${path}.${key}` : key;

        if (typeof obj2[key] === 'object' && obj2[key] !== null && !Array.isArray(obj2[key])) {
          compare(obj1[key] || {}, obj2[key], newPath);
        } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
          changes.push({
            field: newPath,
            before: obj1[key],
            after: obj2[key],
          });
        }
      }
    };

    compare(originalClaim, scrubbedClaim);

    return {
      hasChanges: changes.length > 0,
      changeCount: changes.length,
      changes,
    };
  }

  /**
   * Pre-submission validation
   */
  async preSubmitValidation(claim) {
    // Run full scrubbing with auto-fix disabled
    const scrubResult = await this.scrub(claim, {
      autoFix: false,
      skipWarnings: false,
    });

    // Check if claim can be submitted
    const canSubmit = scrubResult.status !== ScrubStatus.FAIL;

    return {
      canSubmit,
      status: scrubResult.status,
      blockers: scrubResult.errors,
      warnings: scrubResult.warnings,
      summary: this.getSummary(scrubResult),
      report: this.generateReport(scrubResult),
    };
  }

  /**
   * Get scrubbing statistics
   */
  getStatistics(scrubResults) {
    const stats = {
      totalClaims: scrubResults.length,
      byStatus: {},
      commonErrors: {},
      commonWarnings: {},
      categoryStats: {},
      averageDuration: 0,
      autoFixRate: 0,
    };

    // Count by status
    for (const result of scrubResults) {
      stats.byStatus[result.status] = (stats.byStatus[result.status] || 0) + 1;

      // Common errors
      for (const error of result.errors) {
        stats.commonErrors[error.ruleId] = stats.commonErrors[error.ruleId] || {
          ruleId: error.ruleId,
          ruleName: error.ruleName,
          count: 0,
        };
        stats.commonErrors[error.ruleId].count += 1;
      }

      // Common warnings
      for (const warning of result.warnings) {
        stats.commonWarnings[warning.ruleId] = stats.commonWarnings[warning.ruleId] || {
          ruleId: warning.ruleId,
          ruleName: warning.ruleName,
          count: 0,
        };
        stats.commonWarnings[warning.ruleId].count += 1;
      }

      // Category stats
      for (const [category, counts] of Object.entries(result.categories)) {
        if (!stats.categoryStats[category]) {
          stats.categoryStats[category] = { errors: 0, warnings: 0, info: 0 };
        }
        stats.categoryStats[category].errors += counts.errors;
        stats.categoryStats[category].warnings += counts.warnings;
        stats.categoryStats[category].info += counts.info;
      }
    }

    // Convert to arrays and sort
    stats.commonErrors = Object.values(stats.commonErrors)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    stats.commonWarnings = Object.values(stats.commonWarnings)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate averages
    const totalDuration = scrubResults.reduce((sum, r) => sum + r.duration, 0);
    stats.averageDuration = Math.round(totalDuration / scrubResults.length);

    const totalFixed = scrubResults.reduce((sum, r) => sum + r.summary.fixedCount, 0);
    const totalErrors = scrubResults.reduce((sum, r) => sum + r.summary.errorCount, 0);
    stats.autoFixRate =
      totalErrors > 0 ? ((totalFixed / (totalErrors + totalFixed)) * 100).toFixed(2) : 0;

    return stats;
  }
}

// Singleton instance
const claimScrubber = new ClaimScrubber();

module.exports = {
  ClaimScrubber,
  claimScrubber,
  ScrubStatus,
  RuleCategory,
  SeverityLevel,
};
