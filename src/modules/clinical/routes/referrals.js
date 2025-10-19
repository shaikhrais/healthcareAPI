const express = require('express');

const referralsController = require('../controllers/referralsController');

/**
 * @swagger
 * components:
 *   schemas:
 *     ReferralCode:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Referral code ID
 *         userId:
 *           type: string
 *           description: User who owns this referral code
 *         code:
 *           type: string
 *           description: Unique referral code
 *           example: "JOHN2024"
 *         isCustom:
 *           type: boolean
 *           description: Whether this is a custom user-defined code
 *         isActive:
 *           type: boolean
 *           description: Whether the code is active
 *         totalClicks:
 *           type: integer
 *           description: Total number of clicks on referral links
 *         totalSignups:
 *           type: integer
 *           description: Total successful signups from this code
 *         totalRewards:
 *           type: number
 *           format: float
 *           description: Total rewards earned
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     Referral:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Referral ID
 *         referrerId:
 *           type: string
 *           description: User who made the referral
 *         referralCode:
 *           type: string
 *           description: Referral code used
 *         refereeEmail:
 *           type: string
 *           format: email
 *           description: Email of referred person
 *         refereeId:
 *           type: string
 *           description: User ID of referee (after signup)
 *         status:
 *           type: string
 *           enum: [invited, clicked, signed_up, completed, rewarded]
 *           description: Current referral status
 *         inviteMethod:
 *           type: string
 *           enum: [email, sms, social, link]
 *           description: How the invite was sent
 *         clickedAt:
 *           type: string
 *           format: date-time
 *           description: When referral link was clicked
 *         signedUpAt:
 *           type: string
 *           format: date-time
 *           description: When referee signed up
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: When referral action was completed
 *         rewardAmount:
 *           type: number
 *           format: float
 *           description: Reward amount for this referral
 *         rewardClaimed:
 *           type: boolean
 *           description: Whether reward has been claimed
 *         rewardClaimedAt:
 *           type: string
 *           format: date-time
 *           description: When reward was claimed
 *         metadata:
 *           type: object
 *           description: Additional referral metadata
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     ReferralStats:
 *       type: object
 *       properties:
 *         totalInvites:
 *           type: integer
 *           description: Total invites sent
 *         totalClicks:
 *           type: integer
 *           description: Total link clicks
 *         totalSignups:
 *           type: integer
 *           description: Total successful signups
 *         totalCompleted:
 *           type: integer
 *           description: Total completed referrals
 *         totalRewards:
 *           type: number
 *           format: float
 *           description: Total rewards earned
 *         claimedRewards:
 *           type: number
 *           format: float
 *           description: Total rewards claimed
 *         pendingRewards:
 *           type: number
 *           format: float
 *           description: Pending rewards to claim
 *         conversionRate:
 *           type: number
 *           format: float
 *           description: Signup conversion rate percentage
 *         completionRate:
 *           type: number
 *           format: float
 *           description: Completion rate percentage
 *         leaderboardRank:
 *           type: integer
 *           description: Current leaderboard ranking
 *     
 *     LeaderboardEntry:
 *       type: object
 *       properties:
 *         rank:
 *           type: integer
 *           description: Leaderboard position
 *         userId:
 *           type: string
 *           description: User ID
 *         username:
 *           type: string
 *           description: Display name
 *         totalReferrals:
 *           type: integer
 *           description: Total successful referrals
 *         totalRewards:
 *           type: number
 *           format: float
 *           description: Total rewards earned
 *         isCurrentUser:
 *           type: boolean
 *           description: Whether this is the requesting user
 */

/**
 * Referral Routes
 * TASK-14.16 - Share app with friends
 *
 * Comprehensive referral and invite management endpoints
 * Features:
 * - Referral code generation and management
 * - Invite tracking
 * - Reward distribution
 * - Analytics and leaderboards
 * - Social sharing support
 */

const router = express.Router();
// Replace mock middleware with actual implementations
const { authMiddleware, authorize } = require('../../shared/middleware/middleware/auth');

// Replace mock `protect` middleware
router.use(authMiddleware);

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this resource',
      });
    }
    next();
  };
};

// ============================================
// REFERRAL CODE MANAGEMENT
// ============================================

/**
 * @swagger
 * /api/referrals/my-code:
 *   get:
 *     tags: [Referrals]
 *     summary: Get or create referral code for current user
 *     description: Retrieve the user's referral code, creating one if it doesn't exist
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral code retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ReferralCode'
 *       500:
 *         description: Failed to retrieve referral code
 */
router.get('/my-code', authMiddleware, referralsController.getMyCode);

/**
 * @swagger
 * /api/referrals/custom-code:
 *   post:
 *     tags: [Referrals]
 *     summary: Set custom referral code
 *     description: Set a custom referral code for the user (must be unique)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 pattern: '^[A-Z0-9]{4,20}$'
 *                 description: Custom referral code (4-20 alphanumeric characters)
 *                 example: "JOHN2024"
 *     responses:
 *       200:
 *         description: Custom referral code set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/ReferralCode'
 *       400:
 *         description: Invalid code format or code already taken
 *       500:
 *         description: Failed to set custom code
 */
router.post('/custom-code', authMiddleware, referralsController.setCustomCode);

/**
 * @swagger
 * /api/referrals/validate/{code}:
 *   get:
 *     tags: [Referrals]
 *     summary: Validate referral code
 *     description: Check if a referral code exists and is valid
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Referral code to validate
 *         example: "JOHN2024"
 *     responses:
 *       200:
 *         description: Referral code validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                     code:
 *                       type: string
 *                     referrerName:
 *                       type: string
 *                       description: Name of referrer (if valid)
 *       404:
 *         description: Referral code not found
 *       500:
 *         description: Validation failed
 */
router.get('/validate/:code', referralsController.validateCode);

/**
 * @swagger
 * /api/referrals/send-invite:
 *   post:
 *     tags: [Referrals]
 *     summary: Record sending an invite
 *     description: Record that an invite was sent via specified method
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - method
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email of person being invited
 *                 example: "friend@example.com"
 *               method:
 *                 type: string
 *                 enum: [email, sms, social, link]
 *                 description: Method used to send invite
 *                 example: "email"
 *               message:
 *                 type: string
 *                 description: Optional custom message
 *                 example: "Check out this amazing healthcare app!"
 *     responses:
 *       201:
 *         description: Invite recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Referral'
 *       400:
 *         description: Invalid invite data
 *       500:
 *         description: Failed to record invite
 */
router.post('/send-invite', authMiddleware, referralsController.sendInvite);

/**
 * @swagger
 * /api/referrals/track-click:
 *   post:
 *     tags: [Referrals]
 *     summary: Track referral link click
 *     description: Record when someone clicks on a referral link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Referral code that was clicked
 *                 example: "JOHN2024"
 *               userAgent:
 *                 type: string
 *                 description: User agent string
 *               ipAddress:
 *                 type: string
 *                 description: IP address of clicker
 *     responses:
 *       200:
 *         description: Click tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid tracking data
 *       500:
 *         description: Failed to track click
 */
router.post('/track-click', referralsController.trackClick);

/**
 * @swagger
 * /api/referrals/complete-signup:
 *   post:
 *     tags: [Referrals]
 *     summary: Mark referral as signed up
 *     description: Mark that a referred user has completed signup
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - referralCode
 *             properties:
 *               referralCode:
 *                 type: string
 *                 description: Referral code used during signup
 *                 example: "JOHN2024"
 *     responses:
 *       200:
 *         description: Signup completion recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Referral'
 *       400:
 *         description: Invalid referral code
 *       500:
 *         description: Failed to record signup completion
 */
router.post('/complete-signup', authMiddleware, referralsController.completeSignup);

/**
 * @swagger
 * /api/referrals/{id}/complete-action:
 *   post:
 *     tags: [Referrals]
 *     summary: Mark referral action as completed
 *     description: Mark that a referred user has completed the required action (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Referral ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rewardAmount:
 *                 type: number
 *                 format: float
 *                 description: Reward amount to assign
 *                 example: 10.00
 *               notes:
 *                 type: string
 *                 description: Optional notes
 *     responses:
 *       200:
 *         description: Action completion recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Referral'
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Referral not found
 *       500:
 *         description: Failed to record completion
 */
router.post('/:id/complete-action', authorize('admin', 'manager'), referralsController.completeAction);

/**
 * @swagger
 * /api/referrals/my-referrals:
 *   get:
 *     tags: [Referrals]
 *     summary: Get user's referrals
 *     description: Retrieve all referrals made by the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [invited, clicked, signed_up, completed, rewarded]
 *         description: Filter by referral status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Referrals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Referral'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Failed to retrieve referrals
 */
router.get('/my-referrals', authMiddleware, referralsController.getMyReferrals);

/**
 * @swagger
 * /api/referrals/my-stats:
 *   get:
 *     tags: [Referrals]
 *     summary: Get user's referral statistics
 *     description: Retrieve comprehensive statistics about user's referral performance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ReferralStats'
 *       500:
 *         description: Failed to retrieve statistics
 */
router.get('/my-stats', authMiddleware, referralsController.getMyStats);

/**
 * @swagger
 * /api/referrals/my-rewards:
 *   get:
 *     tags: [Referrals]
 *     summary: Get user's unclaimed rewards
 *     description: Retrieve all unclaimed rewards for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rewards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     unclaimedRewards:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           referralId:
 *                             type: string
 *                           refereeEmail:
 *                             type: string
 *                           rewardAmount:
 *                             type: number
 *                             format: float
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                     totalAmount:
 *                       type: number
 *                       format: float
 *                       description: Total unclaimed reward amount
 *       500:
 *         description: Failed to retrieve rewards
 */
router.get('/my-rewards', authMiddleware, referralsController.getMyRewards);

/**
 * @swagger
 * /api/referrals/{id}/claim-reward:
 *   post:
 *     tags: [Referrals]
 *     summary: Claim referral reward
 *     description: Claim a specific referral reward
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Referral ID
 *     responses:
 *       200:
 *         description: Reward claimed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     rewardAmount:
 *                       type: number
 *                       format: float
 *                     claimedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Reward already claimed or not available
 *       404:
 *         description: Referral not found
 *       500:
 *         description: Failed to claim reward
 */
router.post('/:id/claim-reward', authMiddleware, referralsController.claimReward);

/**
 * @swagger
 * /api/referrals/batch-claim:
 *   post:
 *     tags: [Referrals]
 *     summary: Claim all available rewards
 *     description: Claim all unclaimed rewards for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Batch claim completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     claimedCount:
 *                       type: integer
 *                       description: Number of rewards claimed
 *                     totalAmount:
 *                       type: number
 *                       format: float
 *                       description: Total amount claimed
 *                     claimedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: No rewards available to claim
 *       500:
 *         description: Failed to claim rewards
 */
router.post('/batch-claim', authMiddleware, referralsController.batchClaim);

/**
 * @swagger
 * /api/referrals/leaderboard:
 *   get:
 *     tags: [Referrals]
 *     summary: Get referral leaderboard
 *     description: Retrieve the top referrers leaderboard
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of top entries to return
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [all, monthly, weekly]
 *           default: all
 *         description: Time period for leaderboard
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeaderboardEntry'
 *       500:
 *         description: Failed to retrieve leaderboard
 */
router.get('/leaderboard', referralsController.getLeaderboard);

/**
 * @swagger
 * /api/referrals/analytics:
 *   get:
 *     tags: [Referrals]
 *     summary: Get referral analytics
 *     description: Retrieve comprehensive referral analytics (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         totalReferrals:
 *                           type: integer
 *                         totalRewards:
 *                           type: number
 *                           format: float
 *                         conversionRate:
 *                           type: number
 *                           format: float
 *                     trends:
 *                       type: object
 *                       properties:
 *                         dailySignups:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 format: date
 *                               count:
 *                                 type: integer
 *                     topReferrers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LeaderboardEntry'
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Failed to retrieve analytics
 */
router.get('/analytics', authorize('admin', 'manager'), referralsController.getAnalytics);

/**
 * @swagger
 * /api/referrals/share-message:
 *   get:
 *     tags: [Referrals]
 *     summary: Get pre-formatted share message
 *     description: Get a pre-formatted message for sharing referral code
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [email, sms, social, generic]
 *           default: generic
 *         description: Platform for message formatting
 *     responses:
 *       200:
 *         description: Share message retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       description: Pre-formatted share message
 *                     referralLink:
 *                       type: string
 *                       description: Complete referral link
 *                     code:
 *                       type: string
 *                       description: Referral code
 *       500:
 *         description: Failed to generate share message
 */
router.get('/share-message', authMiddleware, referralsController.getShareMessage);

/**
 * @swagger
 * /api/referrals/all:
 *   get:
 *     tags: [Referrals]
 *     summary: Get all referrals (admin)
 *     description: Retrieve all referrals in the system (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [invited, clicked, signed_up, completed, rewarded]
 *         description: Filter by referral status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by referrer or referee email
 *     responses:
 *       200:
 *         description: All referrals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Referral'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Failed to retrieve referrals
 */
router.get('/all', authorize('admin', 'manager'), referralsController.getAll);

/**
 * @swagger
 * /api/referrals/{id}:
 *   put:
 *     tags: [Referrals]
 *     summary: Update referral (admin)
 *     description: Update referral details (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Referral ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [invited, clicked, signed_up, completed, rewarded]
 *                 description: Update referral status
 *               rewardAmount:
 *                 type: number
 *                 format: float
 *                 description: Update reward amount
 *               notes:
 *                 type: string
 *                 description: Admin notes
 *     responses:
 *       200:
 *         description: Referral updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Referral'
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Referral not found
 *       500:
 *         description: Failed to update referral
 */
router.put('/:id', authorize('admin'), referralsController.updateReferral);

module.exports = router;
