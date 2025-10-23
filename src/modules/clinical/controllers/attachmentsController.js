// controllers/attachmentsController.js
// Handles business logic for claim attachments
const { validationResult } = require('express-validator');
const ClaimAttachment = require('../models/ClaimAttachment');
const Claim = require('../models/Claim');
const { attachmentStorageService } = require('../services/attachmentStorageService');
const ErrorManager = require('../../../shared/managers/ErrorManager');


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
    ErrorManager.log(error, { endpoint: 'uploadAttachments' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.getAttachmentMetadata = async (req, res, next) => {
  try {
    const { attachmentId } = req.params;
    const result = await attachmentStorageService.getAttachmentMetadata(attachmentId);
    if (result.success) {
      res.json(result.metadata);
    } else {
      throw new NotFoundError('Attachment', attachmentId);
    }
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'getAttachmentMetadata' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.downloadAttachment = async (req, res, next) => {
  try {
    const { attachmentId } = req.params;
    const result = await attachmentStorageService.downloadAttachment(attachmentId);
    if (result.success) {
      res.setHeader('Content-Disposition', `attachment; filename="${result.file.filename}"`);
      res.send(result.file.buffer);
    } else {
      throw new NotFoundError('Attachment', attachmentId);
    }
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'downloadAttachment' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.deleteAttachment = async (req, res, next) => {
  try {
    const { attachmentId } = req.params;
    const result = await attachmentStorageService.deleteAttachment(attachmentId);
    if (result.success) {
      res.json({ success: true, deleted: true, id: attachmentId });
    } else {
      throw new NotFoundError('Attachment', attachmentId);
    }
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'deleteAttachment' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.listClaimAttachments = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const result = await attachmentStorageService.listClaimAttachments(claimId);
    res.json(result.attachments);
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'listClaimAttachments' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.validateAttachment = async (req, res, next) => {
  try {
    const { attachmentId } = req.params;
    const result = await attachmentStorageService.validateAttachment(attachmentId);
    res.json({ valid: result.valid, id: attachmentId });
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'validateAttachment' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.submitAttachment = async (req, res, next) => {
  try {
    const { attachmentId } = req.params;
    const result = await attachmentStorageService.submitAttachment(attachmentId);
    res.json({ submitted: result.submitted, id: attachmentId });
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'submitAttachment' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.archiveAttachment = async (req, res, next) => {
  try {
    const { attachmentId } = req.params;
    const result = await attachmentStorageService.archiveAttachment(attachmentId);
    res.json({ archived: result.archived, id: attachmentId });
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'archiveAttachment' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.getAttachmentStats = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const result = await attachmentStorageService.getAttachmentStats(claimId);
    res.json(result.stats);
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'getAttachmentStats' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.getPendingSubmissions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await attachmentStorageService.getPendingSubmissions(userId);
    res.json(result.pending);
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'getPendingSubmissions' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.batchValidateAttachments = async (req, res, next) => {
  try {
    const { attachmentIds } = req.body;
    const result = await attachmentStorageService.batchValidateAttachments(attachmentIds);
    res.json(result.results);
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'batchValidateAttachments' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.updateAttachment = async (req, res, next) => {
  try {
    const { attachmentId } = req.params;
    const updateData = req.body;
    const result = await attachmentStorageService.updateAttachment(attachmentId, updateData);
    res.json({ updated: result.updated, id: attachmentId, data: result.data });
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'updateAttachment' });
    next(ErrorManager.toHttp(error).body);
  }
};
