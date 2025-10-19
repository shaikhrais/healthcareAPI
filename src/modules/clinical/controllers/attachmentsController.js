// controllers/attachmentsController.js
// Handles business logic for claim attachments
const { validationResult } = require('express-validator');
const ClaimAttachment = require('../models/ClaimAttachment');
const Claim = require('../models/Claim');
const { attachmentStorageService } = require('../services/attachmentStorageService');
const { logger } = require('../utils/logger');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');


exports.uploadAttachments = async (req, res, next) => {
  try {
    const { files, body } = req;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const result = await attachmentStorageService.saveAttachments(files, body);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Attachments uploaded successfully',
        data: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to upload attachments',
        error: result.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.getAttachmentMetadata = async (req, res, next) => {
  try {
    // TODO: Move get metadata logic here
    res.json({ message: 'Get attachment metadata (controller stub)' });
  } catch (error) {
    next(error);
  }
};

exports.downloadAttachment = async (req, res, next) => {
  try {
    // TODO: Move download logic here
    res.json({ message: 'Download attachment (controller stub)' });
  } catch (error) {
    next(error);
  }
};

exports.deleteAttachment = async (req, res, next) => {
  try {
    // TODO: Move delete logic here
    res.json({ message: 'Delete attachment (controller stub)' });
  } catch (error) {
    next(error);
  }
};

exports.listClaimAttachments = async (req, res, next) => {
  try {
    // TODO: Move list logic here
    res.json({ message: 'List claim attachments (controller stub)' });
  } catch (error) {
    next(error);
  }
};

exports.validateAttachment = async (req, res, next) => {
  try {
    // TODO: Move validate logic here
    res.json({ message: 'Validate attachment (controller stub)' });
  } catch (error) {
    next(error);
  }
};

exports.submitAttachment = async (req, res, next) => {
  try {
    // TODO: Move submit logic here
    res.json({ message: 'Submit attachment (controller stub)' });
  } catch (error) {
    next(error);
  }
};

exports.archiveAttachment = async (req, res, next) => {
  try {
    // TODO: Move archive logic here
    res.json({ message: 'Archive attachment (controller stub)' });
  } catch (error) {
    next(error);
  }
};

exports.getAttachmentStats = async (req, res, next) => {
  try {
    // TODO: Move stats logic here
    res.json({ message: 'Get attachment stats (controller stub)' });
  } catch (error) {
    next(error);
  }
};

exports.getPendingSubmissions = async (req, res, next) => {
  try {
    // TODO: Move pending submissions logic here
    res.json({ message: 'Get pending submissions (controller stub)' });
  } catch (error) {
    next(error);
  }
};

exports.batchValidateAttachments = async (req, res, next) => {
  try {
    // TODO: Move batch validate logic here
    res.json({ message: 'Batch validate attachments (controller stub)' });
  } catch (error) {
    next(error);
  }
};

exports.updateAttachment = async (req, res, next) => {
  try {
    // TODO: Move update logic here
    res.json({ message: 'Update attachment (controller stub)' });
  } catch (error) {
    next(error);
  }
};
