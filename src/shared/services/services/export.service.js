const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

/**
 * Export Service
 *
 * Handles generation of Excel, CSV, and PDF exports for various data types.
 * Supports large datasets with streaming and chunking.
 */

class ExportService {
  constructor() {
    this.exportDir = path.join(__dirname, '../exports');
    this.ensureExportDir();
  }

  async ensureExportDir() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Generate CSV export
   */
  async generateCSV(data, columns, filename) {
    const filepath = path.join(this.exportDir, filename);

    try {
      const fields = columns || Object.keys(data[0] || {});
      const parser = new Parser({ fields });
      const csv = parser.parse(data);

      fs.writeFileSync(filepath, csv);

      return {
        filename,
        path: filepath,
        size: fs.statSync(filepath).size,
        mimeType: 'text/csv',
      };
    } catch (error) {
      throw new Error(`CSV generation failed: ${error.message}`);
    }
  }

  /**
   * Generate Excel export
   */
  async generateExcel(data, columns, filename, options = {}) {
    const filepath = path.join(this.exportDir, filename);

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(options.sheetName || 'Export');

      // Set columns
      const columnDefinitions = columns
        ? columns.map((col) => ({
            header: typeof col === 'string' ? col : col.header,
            key: typeof col === 'string' ? col : col.key,
            width: typeof col === 'object' && col.width ? col.width : 15,
          }))
        : Object.keys(data[0] || {}).map((key) => ({
            header: key,
            key,
            width: 15,
          }));

      worksheet.columns = columnDefinitions;

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00C1CA' }, // Jane Cyan
      };
      worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

      // Add data rows
      data.forEach((row) => {
        worksheet.addRow(row);
      });

      // Auto-filter
      worksheet.autoFilter = {
        from: 'A1',
        to: {
          row: 1,
          column: columnDefinitions.length,
        },
      };

      // Freeze header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      await workbook.xlsx.writeFile(filepath);

      return {
        filename,
        path: filepath,
        size: fs.statSync(filepath).size,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    } catch (error) {
      throw new Error(`Excel generation failed: ${error.message}`);
    }
  }

  /**
   * Generate PDF export
   */
  async generatePDF(data, columns, filename, options = {}) {
    const filepath = path.join(this.exportDir, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 30,
        });

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Title
        doc.fontSize(16).text(options.title || 'Data Export', { align: 'center' });
        doc.moveDown();

        // Metadata
        if (options.subtitle) {
          doc.fontSize(10).text(options.subtitle, { align: 'center' });
          doc.moveDown();
        }

        doc.fontSize(8).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        // Table
        const tableTop = doc.y;
        const colWidth = 80;
        let currentY = tableTop;

        // Headers
        const headers = columns || Object.keys(data[0] || {});
        doc.fontSize(9).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(
            typeof header === 'string' ? header : header.header,
            30 + i * colWidth,
            currentY,
            {
              width: colWidth - 5,
              ellipsis: true,
            }
          );
        });

        currentY += 20;
        doc
          .moveTo(30, currentY)
          .lineTo(30 + headers.length * colWidth, currentY)
          .stroke();
        currentY += 5;

        // Data rows (limit to prevent huge PDFs)
        doc.fontSize(8).font('Helvetica');
        const maxRows = Math.min(data.length, 100); // Limit PDF to 100 rows
        for (let i = 0; i < maxRows; i += 1) {
          const row = data[i];

          // Check if new page needed
          if (currentY > 550) {
            doc.addPage();
            currentY = 30;
          }

          headers.forEach((header, j) => {
            const key = typeof header === 'string' ? header : header.key;
            let value = row[key];

            // Format value
            if (value === null || value === undefined) value = '';
            else if (typeof value === 'object') value = JSON.stringify(value);
            else value = String(value);

            doc.text(value, 30 + j * colWidth, currentY, {
              width: colWidth - 5,
              ellipsis: true,
            });
          });

          currentY += 15;
        }

        if (data.length > maxRows) {
          doc.moveDown();
          doc.text(`... and ${data.length - maxRows} more rows`, { align: 'center' });
        }

        doc.end();

        stream.on('finish', () => {
          resolve({
            filename,
            path: filepath,
            size: fs.statSync(filepath).size,
            mimeType: 'application/pdf',
          });
        });

        stream.on('error', reject);
      } catch (error) {
        reject(new Error(`PDF generation failed: ${error.message}`));
      }
    });
  }

  /**
   * Export appointments
   */
  async exportAppointments(filters, format, columns) {
    const Appointment = require('../models/Appointment');

    const query = {};
    if (filters.startDate && filters.endDate) {
      query.startTime = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }
    if (filters.status) query.status = filters.status;
    if (filters.practitioner) query.practitioner = filters.practitioner;
    if (filters.serviceType) query.serviceType = filters.serviceType;

    const appointments = await Appointment.find(query)
      .populate('patient', 'firstName lastName email phone')
      .populate('practitioner', 'firstName lastName')
      .sort({ startTime: -1 })
      .lean();

    // Format data
    const data = appointments.map((appt) => ({
      'Appointment ID': appt._id.toString(),
      'Patient Name': appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : 'N/A',
      'Patient Email': appt.patient?.email || 'N/A',
      Practitioner: appt.practitioner
        ? `${appt.practitioner.firstName} ${appt.practitioner.lastName}`
        : 'N/A',
      'Service Type': appt.serviceType || 'N/A',
      'Appointment Type': appt.appointmentType || 'N/A',
      Date: new Date(appt.startTime).toLocaleDateString(),
      Time: new Date(appt.startTime).toLocaleTimeString(),
      Duration: `${appt.duration} min`,
      Status: appt.status,
      Notes: appt.notes || '',
    }));

    return { data, recordCount: data.length };
  }

  /**
   * Export patients
   */
  async exportPatients(filters, format, columns) {
    const Patient = require('../models/Patient');

    const query = {};
    if (filters.active !== undefined) query.active = filters.active;
    if (filters.assignedPractitioner) query.assignedPractitioner = filters.assignedPractitioner;

    const patients = await Patient.find(query)
      .populate('assignedPractitioner', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const data = patients.map((patient) => ({
      'Patient ID': patient._id.toString(),
      'First Name': patient.firstName,
      'Last Name': patient.lastName,
      Email: patient.email,
      Phone: patient.phone,
      'Date of Birth': new Date(patient.dateOfBirth).toLocaleDateString(),
      Gender: patient.gender || 'N/A',
      Address: patient.address
        ? `${patient.address.street}, ${patient.address.city}, ${patient.address.state}`
        : 'N/A',
      'Assigned Practitioner': patient.assignedPractitioner
        ? `${patient.assignedPractitioner.firstName} ${patient.assignedPractitioner.lastName}`
        : 'N/A',
      Active: patient.active ? 'Yes' : 'No',
      Created: new Date(patient.createdAt).toLocaleDateString(),
    }));

    return { data, recordCount: data.length };
  }

  /**
   * Export payments
   */
  async exportPayments(filters, format, columns) {
    const Payment = require('../models/Payment');

    const query = {};
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }
    if (filters.status) query.status = filters.status;
    if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;

    const payments = await Payment.find(query)
      .populate('patientId', 'firstName lastName')
      .populate('processedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const data = payments.map((payment) => ({
      'Payment ID': payment._id.toString(),
      'Receipt Number': payment.receiptNumber || 'N/A',
      Patient: payment.patientId
        ? `${payment.patientId.firstName} ${payment.patientId.lastName}`
        : 'N/A',
      Amount: `$${payment.amount.toFixed(2)}`,
      Currency: payment.currency,
      'Payment Method': payment.paymentMethod,
      Status: payment.status,
      'Transaction ID': payment.transactionId || 'N/A',
      'Processed By': payment.processedBy
        ? `${payment.processedBy.firstName} ${payment.processedBy.lastName}`
        : 'N/A',
      Date: new Date(payment.createdAt).toLocaleDateString(),
      Time: new Date(payment.createdAt).toLocaleTimeString(),
    }));

    return { data, recordCount: data.length };
  }

  /**
   * Main export function
   */
  async generateExport(exportType, filters, format, columns, filename, options = {}) {
    let data;
    let recordCount;

    // Fetch data based on export type
    switch (exportType) {
      case 'appointments':
        ({ data, recordCount } = await this.exportAppointments(filters, format, columns));
        break;
      case 'patients':
        ({ data, recordCount } = await this.exportPatients(filters, format, columns));
        break;
      case 'payments':
        ({ data, recordCount } = await this.exportPayments(filters, format, columns));
        break;
      default:
        throw new Error(`Unsupported export type: ${exportType}`);
    }

    // Generate file based on format
    let fileInfo;
    switch (format) {
      case 'csv':
        fileInfo = await this.generateCSV(data, columns, filename);
        break;
      case 'excel':
        fileInfo = await this.generateExcel(data, columns, filename, options);
        break;
      case 'pdf':
        fileInfo = await this.generatePDF(data, columns, filename, options);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return { fileInfo, recordCount };
  }
}

module.exports = new ExportService();
