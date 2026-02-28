import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAllData
} from '../controllers/authController.js';

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});
router.delete('/delete-all-data', authenticateToken, deleteAllData);

export default router;
