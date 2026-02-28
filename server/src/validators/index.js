import Joi from 'joi';

// User validation schemas
export const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username must not exceed 50 characters',
    'any.required': 'Username is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).max(255).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password must not exceed 255 characters',
    'any.required': 'Password is required'
  }),
  firstName: Joi.string().min(1).max(50).required().messages({
    'string.min': 'First name is required',
    'string.max': 'First name must not exceed 50 characters',
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().min(1).max(50).required().messages({
    'string.min': 'Last name is required',
    'string.max': 'Last name must not exceed 50 characters',
    'any.required': 'Last name is required'
  })
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

export const updateProfileSchema = Joi.object({
  username: Joi.string().min(3).max(50),
  firstName: Joi.string().min(1).max(50),
  lastName: Joi.string().min(1).max(50),
  avatar: Joi.string().uri().allow('')
}).min(0);

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string().min(6).max(255).required().messages({
    'string.min': 'New password must be at least 6 characters long',
    'string.max': 'New password must not exceed 255 characters',
    'any.required': 'New password is required'
  })
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  newPassword: Joi.string().min(6).max(255).required().messages({
    'string.min': 'New password must be at least 6 characters long',
    'string.max': 'New password must not exceed 255 characters',
    'any.required': 'New password is required'
  })
});

// Category validation schemas
export const categorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Category name is required',
    'string.max': 'Category name must not exceed 100 characters',
    'any.required': 'Category name is required'
  }),
  description: Joi.string().max(500).allow(''),
  color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#3B82F6').messages({
    'string.pattern.base': 'Color must be a valid hex color code'
  }),
  icon: Joi.string().max(50).allow(''),
  type: Joi.string().valid('expense', 'income').default('expense').messages({
    'any.only': 'Type must be either expense or income'
  })
});

// Expense validation schemas
export const expenseSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Amount must be a positive number',
    'any.required': 'Amount is required'
  }),
  categoryId: Joi.string().uuid().required().messages({
    'string.uuid': 'Invalid category ID',
    'any.required': 'Category is required'
  }),
  description: Joi.string().max(1000).allow(''),
  date: Joi.date().required().messages({
    'any.required': 'Date is required'
  }),
  type: Joi.string().valid('expense', 'income').default('expense').messages({
    'any.only': 'Type must be either expense or income'
  }),
  tags: Joi.array().items(Joi.string().max(50)).default([]),
  location: Joi.string().max(255).allow(''),
  paymentMethod: Joi.string().valid('cash', 'card', 'bank_transfer', 'digital_wallet', 'other').allow('')
});

// Budget validation schemas
export const budgetSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Budget name is required',
    'string.max': 'Budget name must not exceed 100 characters',
    'any.required': 'Budget name is required'
  }),
  description: Joi.string().max(500).allow(''),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Budget amount must be a positive number',
    'any.required': 'Budget amount is required'
  }),
  period: Joi.string().valid('weekly', 'monthly', 'yearly').default('monthly').messages({
    'any.only': 'Period must be weekly, monthly, or yearly'
  }),
  startDate: Joi.date().required().messages({
    'any.required': 'Start date is required'
  }),
  endDate: Joi.date().greater(Joi.ref('startDate')).required().messages({
    'date.greater': 'End date must be after start date',
    'any.required': 'End date is required'
  }),
  categoryId: Joi.string().allow(null),
  alertThreshold: Joi.number().min(0).max(100).default(80).messages({
    'number.min': 'Alert threshold must be between 0 and 100',
    'number.max': 'Alert threshold must be between 0 and 100'
  })
});

// Query validation schemas
export const dateRangeSchema = Joi.object({
  startDate: Joi.date(),
  endDate: Joi.date().greater(Joi.ref('startDate')),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('date', 'amount', 'title', 'createdAt').default('date'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});
