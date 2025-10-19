const express = require('express');
const multer = require('multer');
const documentsController = require('../controllers/documentsController');
const router = express.Router();
const storage = multer.memoryStorage();
const uploadMiddleware = require('../middlewares/uploadMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Document:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Document ID
 *         patientId:
 *           type: string
 *           description: Associated patient ID
 *         title:
 *           type: string
 *           example: "Lab Results - Blood Work"
 *         type:
 *           type: string
 *           enum: [lab_result, imaging, report, consent, insurance]
 *           example: "lab_result"
 *         status:
 *           type: string
 *           enum: [pending, verified, archived, flagged]
 *           example: "verified"
 *         uploadedBy:
 *           type: string
 *           description: User ID who uploaded the document
 *         pages:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               pageNumber:
 *                 type: integer
 *               imageUrl:
 *                 type: string
 *               ocrText:
 *                 type: string
 *               qualityScore:
 *                 type: number
 *         metadata:
 *           type: object
 *           properties:
 *             fileSize:
 *               type: number
 *             mimeType:
 *               type: string
 *             originalName:
 *               type: string
 *         flags:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *               resolved:
 *                 type: boolean
 *         comments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               text:
 *                 type: string
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// All routes should use authentication middleware in production
// Uncomment the following line if authentication is required
// router.use(authMiddleware);

/**
 * @swagger
 * /api/clinical/documents:
 *   post:
 *     tags: [Clinical]
 *     summary: Upload a new document
 *     description: Upload a clinical document (PDF, image, etc.) for a patient
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - patientId
 *               - type
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Document file to upload
 *               patientId:
 *                 type: string
 *                 description: Patient ID
 *               type:
 *                 type: string
 *                 enum: [lab_result, imaging, report, consent, insurance]
 *               title:
 *                 type: string
 *                 description: Document title
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       400:
 *         description: Invalid file or missing data
 *       500:
 *         description: Upload failed
 */
router.post('/', uploadMiddleware.single('file'), documentsController.createDocument);

/**
 * @swagger
 * /api/clinical/documents:
 *   get:
 *     tags: [Clinical]
 *     summary: Get all documents
 *     description: Retrieve all clinical documents with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: Filter by patient ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [lab_result, imaging, report, consent, insurance]
 *         description: Filter by document type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, verified, archived, flagged]
 *         description: Filter by document status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of documents to return
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       500:
 *         description: Failed to retrieve documents
 */
router.get('/', protect, documentsController.getAllDocuments);

/**
 * @swagger
 * /api/clinical/documents/{id}:
 *   get:
 *     tags: [Clinical]
 *     summary: Get document by ID
 *     description: Retrieve a specific document with all its details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       404:
 *         description: Document not found
 *       500:
 *         description: Failed to retrieve document
 */
router.get('/:id', protect, documentsController.getDocumentById);

/**
 * @swagger
 * /api/clinical/documents/{id}:
 *   put:
 *     tags: [Clinical]
 *     summary: Update document
 *     description: Update document metadata and properties
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [lab_result, imaging, report, consent, insurance]
 *               status:
 *                 type: string
 *                 enum: [pending, verified, archived, flagged]
 *     responses:
 *       200:
 *         description: Document updated successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Update failed
 */
router.put('/:id', protect, documentsController.updateDocument);

/**
 * @swagger
 * /api/clinical/documents/{id}:
 *   delete:
 *     tags: [Clinical]
 *     summary: Delete document
 *     description: Soft delete a clinical document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Delete failed
 */
router.delete('/:id', protect, documentsController.deleteDocument);

/**
 * @swagger
 * /api/clinical/documents/{id}/pages:
 *   post:
 *     tags: [Clinical]
 *     summary: Upload additional page to document
 *     description: Add a new page/image to an existing document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Page image to upload
 *     responses:
 *       201:
 *         description: Page uploaded successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Upload failed
 */
router.post('/:id/pages', protect, uploadMiddleware.single('image'), documentsController.uploadPage);
/**
 * @swagger
 * /api/clinical/documents/{id}/pages/{pageNumber}/ocr:
 *   post:
 *     tags: [Clinical]
 *     summary: Process OCR on specific page
 *     description: Run optical character recognition on a specific page of a document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *       - in: path
 *         name: pageNumber
 *         required: true
 *         schema:
 *           type: integer
 *         description: Page number (1-based)
 *     responses:
 *       200:
 *         description: OCR processing completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 extractedText:
 *                   type: string
 *                   description: Extracted text content
 *                 confidence:
 *                   type: number
 *                   description: OCR confidence score
 *       404:
 *         description: Document or page not found
 *       500:
 *         description: OCR processing failed
 */
router.post('/:id/pages/:pageNumber/ocr', protect, documentsController.processOCR);

/**
 * @swagger
 * /api/clinical/documents/{id}/pages/{pageNumber}/quality:
 *   post:
 *     tags: [Clinical]
 *     summary: Assess quality of specific page
 *     description: Run quality assessment on a specific page of a document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *       - in: path
 *         name: pageNumber
 *         required: true
 *         schema:
 *           type: integer
 *         description: Page number (1-based)
 *     responses:
 *       200:
 *         description: Quality assessment completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qualityScore:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 100
 *                 issues:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: Document or page not found
 *       500:
 *         description: Quality assessment failed
 */
router.post('/:id/pages/:pageNumber/quality', protect, documentsController.assessQuality);
router.get('/', protect, documentsController.getAllDocuments);
router.get('/:id', protect, documentsController.getDocumentById);
router.put('/:id', protect, documentsController.updateDocument);
router.delete('/:id', protect, documentsController.deleteDocument);
/**
 * @swagger
 * /api/clinical/documents/{id}/verify:
 *   post:
 *     tags: [Clinical]
 *     summary: Verify document
 *     description: Mark document as verified by authorized staff
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document verified successfully
 *       404:
 *         description: Document not found
 *       403:
 *         description: Not authorized to verify documents
 *       500:
 *         description: Verification failed
 */
router.post('/:id/verify', protect, documentsController.verifyDocument);

/**
 * @swagger
 * /api/clinical/documents/{id}/archive:
 *   post:
 *     tags: [Clinical]
 *     summary: Archive document
 *     description: Archive a document to move it to long-term storage
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document archived successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Archive operation failed
 */
router.post('/:id/archive', protect, documentsController.archiveDocument);

/**
 * @swagger
 * /api/clinical/documents/{id}/comments:
 *   post:
 *     tags: [Clinical]
 *     summary: Add comment to document
 *     description: Add a comment or note to a clinical document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Comment text
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Failed to add comment
 */
router.post('/:id/comments', protect, documentsController.addComment);

/**
 * @swagger
 * /api/clinical/documents/{id}/flags:
 *   post:
 *     tags: [Clinical]
 *     summary: Add flag to document
 *     description: Flag a document for issues or special attention
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - reason
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [quality_issue, incomplete, requires_review, urgent]
 *               reason:
 *                 type: string
 *                 description: Reason for flagging
 *     responses:
 *       201:
 *         description: Flag added successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Failed to add flag
 */
router.post('/:id/flags', protect, documentsController.addFlag);

/**
 * @swagger
 * /api/clinical/documents/{id}/flags/{flagId}/resolve:
 *   put:
 *     tags: [Clinical]
 *     summary: Resolve document flag
 *     description: Mark a flag as resolved
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *       - in: path
 *         name: flagId
 *         required: true
 *         schema:
 *           type: string
 *         description: Flag ID
 *     responses:
 *       200:
 *         description: Flag resolved successfully
 *       404:
 *         description: Document or flag not found
 *       500:
 *         description: Failed to resolve flag
 */
router.put('/:id/flags/:flagId/resolve', protect, documentsController.resolveFlag);

/**
 * @swagger
 * /api/clinical/documents/patient/{patientId}:
 *   get:
 *     tags: [Clinical]
 *     summary: Get documents by patient ID
 *     description: Retrieve all documents for a specific patient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [lab_result, imaging, report, consent, insurance]
 *         description: Filter by document type
 *     responses:
 *       200:
 *         description: Patient documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       404:
 *         description: Patient not found
 *       500:
 *         description: Failed to retrieve documents
 */
router.get('/patient/:patientId', protect, documentsController.getDocumentsByPatient);

/**
 * @swagger
 * /api/clinical/documents/search/query:
 *   get:
 *     tags: [Clinical]
 *     summary: Search documents
 *     description: Search documents by keywords in title or content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [lab_result, imaging, report, consent, insurance]
 *         description: Filter by document type
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       500:
 *         description: Search failed
 */
router.get('/search/query', protect, documentsController.searchDocuments);

/**
 * @swagger
 * /api/clinical/documents/review/pending:
 *   get:
 *     tags: [Clinical]
 *     summary: Get pending review documents
 *     description: Retrieve documents that require staff review
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending review documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       500:
 *         description: Failed to retrieve pending reviews
 */
router.get('/review/pending', protect, documentsController.getPendingReviews);

/**
 * @swagger
 * /api/clinical/documents/quality/issues:
 *   get:
 *     tags: [Clinical]
 *     summary: Get documents with quality issues
 *     description: Retrieve documents flagged with quality problems
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quality issue documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       500:
 *         description: Failed to retrieve quality issues
 */
router.get('/quality/issues', protect, documentsController.getQualityIssues);

/**
 * @swagger
 * /api/clinical/documents/analytics/stats:
 *   get:
 *     tags: [Clinical]
 *     summary: Get document analytics
 *     description: Retrieve analytics and statistics about document usage
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalDocuments:
 *                   type: integer
 *                 documentsByType:
 *                   type: object
 *                 documentsByStatus:
 *                   type: object
 *                 recentActivity:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Failed to retrieve analytics
 */
router.get('/analytics/stats', protect, documentsController.getAnalyticsStats);

module.exports = router;
