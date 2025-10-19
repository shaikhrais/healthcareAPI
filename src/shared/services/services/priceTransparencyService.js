const fs = require('fs').promises;
const path = require('path');


const FeeSchedule = require('../models/FeeSchedule');
const PatientResponsibilityEstimate = require('../models/PatientResponsibilityEstimate');
const { logger } = require('../utils/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');
/**
 * Price Transparency Service
 *
 * Manages cost transparency, price comparisons, and federal compliance
 */

/**
 * Price Transparency Service
 */
class PriceTransparencyService {
  /**
   * Get standard charges for public display
   */
  async getStandardCharges(options = {}) {
    try {
      const schedule = await FeeSchedule.getActiveSchedule('standard');

      if (!schedule) {
        throw new NotFoundError('No active standard fee schedule found');
      }

      let items = schedule.items.filter((item) => item.isActive);

      // Filter by category if specified
      if (options.category) {
        items = items.filter((item) => item.serviceCategory === options.category);
      }

      // Filter by code if specified
      if (options.codeSearch) {
        const searchTerm = options.codeSearch.toLowerCase();
        items = items.filter(
          (item) =>
            item.procedureCode.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm)
        );
      }

      // Sort
      items.sort((a, b) => a.description.localeCompare(b.description));

      // Limit results
      if (options.limit) {
        items = items.slice(0, options.limit);
      }

      return {
        facilityName: schedule.facility.name,
        facilityNPI: schedule.facility.npi,
        lastUpdated: schedule.updatedAt,
        effectiveDate: schedule.effectiveDate,
        disclaimer:
          'Prices shown are standard charges and may not reflect your final cost. Your actual cost depends on your insurance coverage and benefits. Contact us for a personalized estimate.',
        items: items.map((item) => ({
          code: item.procedureCode,
          codeType: item.codeType,
          description: item.description,
          standardCharge: item.standardCharge,
          cashPrice: item.cashPrice || item.standardCharge,
          category: item.serviceCategory,
          unit: item.unitOfMeasure,
          priorAuthRequired: item.priorAuthRequired,
        })),
      };
    } catch (error) {
      logger.error('Failed to get standard charges', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Compare prices across payers
   */
  async comparePrices(procedureCode) {
    try {
      const comparison = await FeeSchedule.comparePrice(procedureCode);

      if (!comparison.description) {
        throw new NotFoundError(`No pricing found for code ${procedureCode}`);
      }

      // Add consumer-friendly information
      comparison.consumerInfo = {
        whatThisMeans:
          'These are the negotiated rates with different insurance companies. Your out-of-pocket cost will depend on your specific insurance plan and benefits.',
        nextSteps: [
          'Contact your insurance company to verify coverage',
          'Request a personalized estimate from our billing team',
          'Ask about payment plans if needed',
        ],
      };

      logger.info('Price comparison generated', {
        procedureCode,
        scheduleCount: comparison.pricesBySchedule.length,
      });

      return comparison;
    } catch (error) {
      logger.error('Failed to compare prices', {
        error: error.message,
        procedureCode,
      });
      throw error;
    }
  }

  /**
   * Search for service prices
   */
  async searchServices(searchTerm, options = {}) {
    try {
      const results = await FeeSchedule.searchProcedures(searchTerm, options);

      // Group by procedure code
      const grouped = {};

      results.forEach((result) => {
        if (!grouped[result.procedureCode]) {
          grouped[result.procedureCode] = {
            procedureCode: result.procedureCode,
            description: result.description,
            serviceCategory: result.serviceCategory,
            prices: [],
          };
        }

        grouped[result.procedureCode].prices.push({
          scheduleType: result.scheduleType,
          payerName: result.payerName,
          standardCharge: result.standardCharge,
          cashPrice: result.cashPrice,
        });
      });

      // Convert to array and calculate ranges
      const searchResults = Object.values(grouped).map((item) => {
        const prices = item.prices.map((p) => p.standardCharge).filter((p) => p);

        return {
          ...item,
          priceRange:
            prices.length > 0
              ? {
                  minimum: Math.min(...prices),
                  maximum: Math.max(...prices),
                  average: prices.reduce((a, b) => a + b, 0) / prices.length,
                }
              : null,
        };
      });

      logger.info('Service search completed', {
        searchTerm,
        resultsCount: searchResults.length,
      });

      return searchResults;
    } catch (error) {
      logger.error('Failed to search services', {
        error: error.message,
        searchTerm,
      });
      throw error;
    }
  }

  /**
   * Get price estimate for patient
   */
  async getPatientEstimate(patientId, procedureCode, insuranceInfo) {
    try {
      // Get standard charge
      const standardSchedule = await FeeSchedule.getActiveSchedule('standard');

      if (!standardSchedule) {
        throw new NotFoundError('No active fee schedule found');
      }

      const standardPrice = standardSchedule.getPriceForCode(procedureCode);

      if (!standardPrice) {
        throw new NotFoundError(`No price found for code ${procedureCode}`);
      }

      // Get contracted rate if insurance provided
      let contractedPrice = null;
      if (insuranceInfo?.payerId) {
        const contractedSchedule = await FeeSchedule.getActiveSchedule(
          'contracted',
          insuranceInfo.payerId
        );

        if (contractedSchedule) {
          contractedPrice = contractedSchedule.getPriceForCode(procedureCode);
        }
      }

      // Get cash price
      const cashPrice = standardPrice.price * 0.8; // 20% cash discount

      // Build estimate
      const estimate = {
        procedureCode,
        description: standardPrice.description,
        standardCharge: standardPrice.price,
        cashPrice,
        estimatedPatientResponsibility: null,
        breakdown: {
          providerCharge: standardPrice.price,
          allowedAmount: contractedPrice?.price || standardPrice.price,
          estimatedInsurancePayment: null,
          estimatedPatientCost: null,
        },
      };

      // If insurance info provided, calculate estimated patient responsibility
      if (insuranceInfo) {
        const allowedAmount = contractedPrice?.price || standardPrice.price;
        const deductibleRemaining = insuranceInfo.deductibleRemaining || 0;
        const coinsurancePercent = insuranceInfo.coinsurancePercent || 20;
        const copay = insuranceInfo.copay || 0;

        let patientOwes = 0;
        let insurancePays = 0;

        // Apply copay
        if (copay > 0) {
          patientOwes += copay;
        }

        // Apply deductible
        const deductibleApplied = Math.min(allowedAmount, deductibleRemaining);
        patientOwes += deductibleApplied;

        // Apply coinsurance on remaining
        const remainingAfterDeductible = allowedAmount - deductibleApplied;
        const coinsuranceAmount = (remainingAfterDeductible * coinsurancePercent) / 100;
        patientOwes += coinsuranceAmount;

        insurancePays = allowedAmount - patientOwes;

        estimate.estimatedPatientResponsibility = Math.round(patientOwes * 100) / 100;
        estimate.breakdown.estimatedInsurancePayment = Math.round(insurancePays * 100) / 100;
        estimate.breakdown.estimatedPatientCost = estimate.estimatedPatientResponsibility;
      } else {
        // No insurance - patient pays cash price
        estimate.estimatedPatientResponsibility = cashPrice;
        estimate.breakdown.estimatedPatientCost = cashPrice;
      }

      estimate.disclaimer =
        'This is an estimate only. Actual costs may vary based on your specific insurance benefits, deductible status, and services provided.';

      logger.info('Patient estimate generated', {
        patientId,
        procedureCode,
        estimate: estimate.estimatedPatientResponsibility,
      });

      return estimate;
    } catch (error) {
      logger.error('Failed to generate patient estimate', {
        error: error.message,
        patientId,
        procedureCode,
      });
      throw error;
    }
  }

  /**
   * Generate machine-readable file for federal compliance
   */
  async generateMachineReadableFile(format = 'JSON') {
    try {
      const data = await FeeSchedule.getTransparencyData();

      if (!data) {
        throw new NotFoundError('No transparency data available');
      }

      let content;
      let filename;

      switch (format.toUpperCase()) {
        case 'JSON':
          content = JSON.stringify(data, null, 2);
          filename = `standard-charges-${Date.now()}.json`;
          break;

        case 'CSV':
          content = this.convertToCSV(data);
          filename = `standard-charges-${Date.now()}.csv`;
          break;

        case 'XML':
          content = this.convertToXML(data);
          filename = `standard-charges-${Date.now()}.xml`;
          break;

        default:
          throw new BadRequestError('Invalid format. Supported: JSON, CSV, XML');
      }

      // Save file
      const outputDir = path.join(__dirname, '../../public/transparency');
      await fs.mkdir(outputDir, { recursive: true });

      const filePath = path.join(outputDir, filename);
      await fs.writeFile(filePath, content, 'utf8');

      // Update transparency compliance record
      const schedule = await FeeSchedule.getActiveSchedule('standard');
      if (schedule) {
        schedule.transparencyCompliance = {
          lastPublished: new Date(),
          publishedUrl: `/transparency/${filename}`,
          fileFormat: format.toUpperCase(),
          machineReadable: true,
          consumerFriendly: format.toUpperCase() === 'JSON',
        };
        await schedule.save();
      }

      logger.info('Machine-readable file generated', {
        format,
        filename,
        itemCount: data.standardCharges.length,
      });

      return {
        format,
        filename,
        url: `/transparency/${filename}`,
        itemCount: data.standardCharges.length,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to generate machine-readable file', {
        error: error.message,
        format,
      });
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    const headers = [
      'Code',
      'Code Type',
      'Description',
      'Standard Charge',
      'Cash Price',
      'Minimum Negotiated Charge',
      'Maximum Negotiated Charge',
      'Service Category',
    ];

    const rows = [headers.join(',')];

    data.standardCharges.forEach((item) => {
      const row = [
        item.code,
        item.codeType,
        `"${item.description}"`,
        item.standardCharge || '',
        item.cashPrice || '',
        item.minimumNegotiatedCharge || '',
        item.maximumNegotiatedCharge || '',
        item.serviceCategory || '',
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * Convert data to XML format
   */
  convertToXML(data) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<standardCharges>\n';
    xml += `  <facility>\n`;
    xml += `    <name>${this.escapeXML(data.facilityName)}</name>\n`;
    xml += `    <npi>${data.facilityNPI}</npi>\n`;
    xml += `    <lastUpdated>${data.lastUpdated}</lastUpdated>\n`;
    xml += `  </facility>\n`;
    xml += `  <charges>\n`;

    data.standardCharges.forEach((item) => {
      xml += `    <charge>\n`;
      xml += `      <code>${item.code}</code>\n`;
      xml += `      <codeType>${item.codeType}</codeType>\n`;
      xml += `      <description>${this.escapeXML(item.description)}</description>\n`;
      xml += `      <standardCharge>${item.standardCharge || 0}</standardCharge>\n`;
      xml += `      <cashPrice>${item.cashPrice || 0}</cashPrice>\n`;
      if (item.minimumNegotiatedCharge) {
        xml += `      <minimumNegotiatedCharge>${item.minimumNegotiatedCharge}</minimumNegotiatedCharge>\n`;
      }
      if (item.maximumNegotiatedCharge) {
        xml += `      <maximumNegotiatedCharge>${item.maximumNegotiatedCharge}</maximumNegotiatedCharge>\n`;
      }
      xml += `      <serviceCategory>${item.serviceCategory || ''}</serviceCategory>\n`;
      xml += `    </charge>\n`;
    });

    xml += `  </charges>\n`;
    xml += '</standardCharges>';

    return xml;
  }

  /**
   * Escape XML special characters
   */
  escapeXML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get price statistics
   */
  async getPriceStatistics(options = {}) {
    try {
      const schedule = await FeeSchedule.getActiveSchedule(options.scheduleType || 'standard');

      if (!schedule) {
        throw new NotFoundError('No active fee schedule found');
      }

      const items = schedule.items.filter((item) => item.isActive);
      const prices = items.map((item) => item.standardCharge).filter((p) => p);

      if (prices.length === 0) {
        return null;
      }

      prices.sort((a, b) => a - b);

      const statistics = {
        count: prices.length,
        minimum: prices[0],
        maximum: prices[prices.length - 1],
        average: prices.reduce((a, b) => a + b, 0) / prices.length,
        median: prices[Math.floor(prices.length / 2)],
        percentile25: prices[Math.floor(prices.length * 0.25)],
        percentile75: prices[Math.floor(prices.length * 0.75)],
        percentile95: prices[Math.floor(prices.length * 0.95)],
      };

      // By category
      const byCategory = {};
      items.forEach((item) => {
        const cat = item.serviceCategory || 'other';
        if (!byCategory[cat]) {
          byCategory[cat] = {
            count: 0,
            total: 0,
            prices: [],
          };
        }
        byCategory[cat].count += 1;
        byCategory[cat].total += item.standardCharge;
        byCategory[cat].prices.push(item.standardCharge);
      });

      Object.keys(byCategory).forEach((cat) => {
        const catPrices = byCategory[cat].prices;
        byCategory[cat].average = byCategory[cat].total / byCategory[cat].count;
        byCategory[cat].minimum = Math.min(...catPrices);
        byCategory[cat].maximum = Math.max(...catPrices);
        delete byCategory[cat].prices; // Remove raw data
      });

      statistics.byCategory = byCategory;

      return statistics;
    } catch (error) {
      logger.error('Failed to get price statistics', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get common services with pricing
   */
  async getCommonServices() {
    try {
      const commonProcedureCodes = [
        '99213', // Office visit, established patient
        '99214', // Office visit, established patient (complex)
        '99203', // Office visit, new patient
        '99204', // Office visit, new patient (complex)
        '99385', // Preventive visit, 18-39 years
        '99386', // Preventive visit, 40-64 years
        '80053', // Comprehensive metabolic panel
        '85025', // Complete blood count
        '36415', // Venipuncture
        '73630', // X-ray, foot
      ];

      const schedule = await FeeSchedule.getActiveSchedule('standard');

      if (!schedule) {
        throw new NotFoundError('No active fee schedule found');
      }

      const services = commonProcedureCodes
        .map((code) => {
          const item = schedule.items.find((i) => i.procedureCode === code && i.isActive);

          if (!item) return null;

          return {
            code: item.procedureCode,
            description: item.description,
            standardCharge: item.standardCharge,
            cashPrice: item.cashPrice || item.standardCharge * 0.8,
            category: item.serviceCategory,
          };
        })
        .filter((s) => s !== null);

      return {
        title: 'Common Services',
        description: 'Pricing for frequently requested services',
        services,
      };
    } catch (error) {
      logger.error('Failed to get common services', {
        error: error.message,
      });
      throw error;
    }
  }
}

// Singleton instance
const priceTransparencyService = new PriceTransparencyService();

module.exports = {
  PriceTransparencyService,
  priceTransparencyService,
};
