import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, Category } from '../models/index.js';
import { generateToken, generateRefreshToken } from '../middleware/auth.js';
import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema 
} from '../validators/index.js';

// Create default categories for new user
const createDefaultCategories = async (userId) => {
  const defaultCategories = [
    { code: "food", name: "Food & Dining", icon: "", color: "#FF6B6B", type: "expense" },
    { code: "transport", name: "Transport", icon: "", color: "#4CAF50", type: "expense" },
    { code: "shopping", name: "Shopping", icon: "", color: "#9C27B0", type: "expense" },
    { code: "entertainment", name: "Entertainment", icon: "", color: "#FF5722", type: "expense" },
    { code: "bills", name: "Bills & Utilities", icon: "", color: "#FF9800", type: "expense" },
    { code: "health", name: "Health", icon: "", color: "#2196F3", type: "expense" },
    { code: "education", name: "Education", icon: "", color: "#3F51B5", type: "expense" },
    { code: "subscriptions", name: "Subscriptions", icon: "", color: "#F44336", type: "expense" },
    { code: "travel", name: "Travel", icon: "", color: "#795548", type: "expense" },
    { code: "other", name: "Other", icon: "", color: "#607D8B", type: "expense" },
    { code: "salary", name: "Salary", icon: "", color: "#4CAF50", type: "income" },
    { code: "freelance", name: "Freelance", icon: "", color: "#2196F3", type: "income" },
    { code: "investment", name: "Investment", icon: "", color: "#FF9800", type: "income" },
    { code: "gift", name: "Gift", icon: "", color: "#9C27B0", type: "income" }
  ];

  try {
    await Promise.all(defaultCategories.map(async (category) => {
      const [createdCategory, created] = await Category.findOrCreate({
        where: {
          userId,
          code: category.code
        },
        defaults: { ...category, userId }
      });
      
      if (created) {
        console.log(`✅ Created category: ${category.name} (${category.code})`);
      } else {
        console.log(`⚠️ Category already exists: ${category.name} (${category.code})`);
      }
    }));
    console.log('✅ Default categories processed for user:', userId);
  } catch (error) {
    console.error('Failed to create default categories:', error);
  }
};

// Register user
export const register = async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [User.sequelize.Sequelize.Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName
    });

    // Create default categories for the new user
    await createDefaultCategories(user.id);

    // Generate token
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Check if user has any categories, create default ones if not
    const userCategories = await Category.findAll({ where: { userId: user.id } });
    if (userCategories.length === 0) {
      console.log('📂 Creating default categories for existing user:', user.id);
      await createDefaultCategories(user.id);
    }

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { error } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { username, firstName, lastName, avatar } = req.body;
    const userId = req.user.id;

    // Check if username is already taken by another user
    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({ 
        where: { username, id: { [User.sequelize.Sequelize.Op.ne]: userId } }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
    }

    // Update user only if there are fields to update
    const updateData = {};
    if (username) updateData.username = username;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (avatar) updateData.avatar = avatar;

    let updatedUser;
    if (Object.keys(updateData).length > 0) {
      updatedUser = await req.user.update(updateData);
    } else {
      updatedUser = req.user; // No changes needed
    }

    // Remove password from response
    const userResponse = updatedUser.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { error } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, req.user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await req.user.update({ password: hashedNewPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { error } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal that user doesn't exist
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpires: resetTokenExpiry
    });

    // TODO: Send email with reset token
    // For now, just return success (in production, implement email sending)
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing forgot password request'
    });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { token, newPassword } = req.body;

    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          [User.sequelize.Sequelize.Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await user.update({
      password: hashedNewPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resetting password'
    });
  }
};

// Delete all user data
export const deleteAllData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Delete all expenses
    await User.sequelize.query('DELETE FROM expenses WHERE userId = :userId', {
      replacements: { userId }
    });
    
    // Delete all categories
    await User.sequelize.query('DELETE FROM categories WHERE userId = :userId', {
      replacements: { userId }
    });
    
    // Delete all budgets
    await User.sequelize.query('DELETE FROM budgets WHERE userId = :userId', {
      replacements: { userId }
    });
    
    res.json({
      success: true,
      message: 'All data deleted successfully'
    });
  } catch (error) {
    console.error('Delete all data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting all data'
    });
  }
};
