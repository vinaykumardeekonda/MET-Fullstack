import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import { categorySchema, dateRangeSchema } from '../validators/index.js';
import { Category, Expense } from '../models/index.js';

const router = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB default
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG, PNG, GIF, PDF, DOC, DOCX files are allowed.'));
    }
  }
});

// Get all categories for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    const userId = req.user.id;

    const whereClause = { userId };
    if (type) {
      whereClause.type = type;
    }

    const categories = await Category.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        categories
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
});

// Get category by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const category = await Category.findOne({
      where: { id, userId },
      include: [{
        model: Expense,
        as: 'expenses',
        attributes: ['id', 'title', 'amount', 'date', 'type']
      }]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: {
        category
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching category'
    });
  }
});

// Create new category
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error } = categorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const categoryData = {
      ...req.body,
      userId: req.user.id
    };

    const category = await Category.create(categoryData);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: {
        category
      }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating category'
    });
  }
});

// Update category
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = categorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    const category = await Category.findOne({ where: { id, userId } });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const updatedCategory = await category.update(req.body);

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: {
        category: updatedCategory
      }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating category'
    });
  }
});

// Delete category
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const category = await Category.findOne({ where: { id, userId } });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has expenses
    const expenseCount = await Expense.count({ where: { categoryId: id } });
    if (expenseCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing expenses'
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting category'
    });
  }
});

// Get category statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify category belongs to user
    const category = await Category.findOne({ where: { id, userId } });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const stats = await Expense.findAll({
      where: { categoryId: id },
      attributes: [
        [Expense.sequelize.fn('COUNT', Expense.sequelize.col('id')), 'total_expenses'],
        [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount')), 'total_amount'],
        [Expense.sequelize.fn('AVG', Expense.sequelize.col('amount')), 'avg_amount'],
        [Expense.sequelize.fn('MIN', Expense.sequelize.col('amount')), 'min_amount'],
        [Expense.sequelize.fn('MAX', Expense.sequelize.col('amount')), 'max_amount']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        categoryId: id,
        categoryName: category.name,
        stats: stats[0]
      }
    });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching category statistics'
    });
  }
});

export default router;
