const express = require('express');

const { body, param } = require('express-validator');




const { NotFoundError, BadRequestError, ConflictError, ErrorFactory } = require('../utils/errors');
const { asyncHandler, validateRequest } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
/**
 * Example Routes with Standardized Error Handling
 *
 * Demonstrates best practices for error handling in routes
 */

const router = express.Router();
// Error classes
// Middleware
// Example model
/**
 * @route   GET /api/example/users
 * @desc    Get all users
 * @access  Public
 */
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const users = await User.find()
      .limit(parseInt(limit, 10))
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10))
      .select('-password');

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

/**
 * @route   GET /api/example/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get(
  '/users/:id',
  validateRequest([param('id').isMongoId().withMessage('Invalid user ID')]),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      throw ErrorFactory.resourceNotFound('User', req.params.id);
    }

    res.json({
      success: true,
      data: { user },
    });
  })
);

/**
 * @route   POST /api/example/users
 * @desc    Create a new user
 * @access  Public
 */
router.post(
  '/users',
  validateRequest([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
  ]),
  asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw ErrorFactory.duplicateEntry('email');
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: user.toJSON(),
      },
    });
  })
);

/**
 * @route   PUT /api/example/users/:id
 * @desc    Update user
 * @access  Private
 */
router.put(
  '/users/:id',
  authMiddleware,
  validateRequest([
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
  ]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      throw ErrorFactory.resourceNotFound('User', id);
    }

    // Check authorization
    if (user._id.toString() !== req.user.userId && req.user.role !== 'owner') {
      throw ErrorFactory.insufficientPermissions();
    }

    // Check for email conflict
    if (updates.email) {
      const emailExists = await User.findOne({
        email: updates.email.toLowerCase(),
        _id: { $ne: id },
      });

      if (emailExists) {
        throw ErrorFactory.duplicateEntry('email');
      }
    }

    // Update user
    Object.assign(user, updates);
    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: user.toJSON(),
      },
    });
  })
);

/**
 * @route   DELETE /api/example/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete(
  '/users/:id',
  authMiddleware,
  validateRequest([param('id').isMongoId().withMessage('Invalid user ID')]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check authorization
    if (!['owner', 'full_access'].includes(req.user.role)) {
      throw ErrorFactory.insufficientPermissions('owner or full_access');
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      throw ErrorFactory.resourceNotFound('User', id);
    }

    // Soft delete (set active to false)
    user.active = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  })
);

/**
 * @route   POST /api/example/users/:id/activate
 * @desc    Activate user
 * @access  Private (Admin only)
 */
router.post(
  '/users/:id/activate',
  authMiddleware,
  validateRequest([param('id').isMongoId().withMessage('Invalid user ID')]),
  asyncHandler(async (req, res) => {
    // Check authorization
    if (!['owner', 'full_access'].includes(req.user.role)) {
      throw ErrorFactory.insufficientPermissions();
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      throw ErrorFactory.resourceNotFound('User', req.params.id);
    }

    if (user.active) {
      throw new ConflictError('User is already active');
    }

    user.active = true;
    await user.save();

    res.json({
      success: true,
      message: 'User activated successfully',
      data: { user: user.toJSON() },
    });
  })
);

/**
 * @route   POST /api/example/error-test
 * @desc    Test error handling (development only)
 * @access  Public
 */
if (process.env.NODE_ENV === 'development') {
  router.post(
    '/error-test',
    asyncHandler(async (req, res) => {
      const { errorType } = req.body;

      switch (errorType) {
        case 'not-found':
          throw ErrorFactory.resourceNotFound('TestResource', '123');

        case 'validation':
          throw ErrorFactory.validationFailed([
            { field: 'email', message: 'Email is required' },
            { field: 'password', message: 'Password must be at least 6 characters' },
          ]);

        case 'unauthorized':
          throw ErrorFactory.tokenInvalid();

        case 'forbidden':
          throw ErrorFactory.insufficientPermissions('admin');

        case 'conflict':
          throw ErrorFactory.duplicateEntry('email');

        case 'internal':
          throw new Error('Simulated internal error');

        case 'async':
          // Simulate async error
          await new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Async operation failed')), 100);
          });
          break;

        default:
          throw new BadRequestError('Invalid errorType parameter');
      }
    })
  );
}

module.exports = router;
