import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import { expenseSchema, dateRangeSchema } from '../validators/index.js';
import { Expense, Category } from '../models/index.js';

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
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB default
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG, PNG, GIF, PDF files are allowed for receipts.'));
    }
  }
});

// Get all expenses for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { error } = dateRangeSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const userId = req.user.id;
    const { 
      startDate, 
      endDate, 
      categoryId, 
      type, 
      page = 1, 
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const whereClause = { userId };
    
    if (startDate && endDate) {
      whereClause.date = {
        [Expense.sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }
    
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    
    if (type) {
      whereClause.type = type;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: expenses } = await Expense.findAndCountAll({
      where: whereClause,
      include: [{
        model: Category,
        as: 'expenseCategory',
        attributes: ['id', 'name', 'color', 'icon']
      }],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expenses'
    });
  }
});

// Get expense by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const expense = await Expense.findOne({
      where: { id, userId },
      include: [{
        model: Category,
        as: 'expenseCategory',
        attributes: ['id', 'name', 'color', 'icon', 'type']
      }]
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: {
        expense
      }
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expense'
    });
  }
});

// Create new expense
router.post('/', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    const { error } = expenseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    // Verify category belongs to user
    const category = await Category.findOne({
      where: { id: req.body.categoryId, userId: req.user.id }
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    const expenseData = {
      ...req.body,
      userId: req.user.id,
      receipt: req.file ? `/uploads/${req.file.filename}` : null
    };

    const expense = await Expense.create(expenseData);

    // Fetch the created expense with category details
    const createdExpense = await Expense.findByPk(expense.id, {
      include: [{
        model: Category,
        as: 'expenseCategory',
        attributes: ['id', 'name', 'color', 'icon']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: {
        expense: createdExpense
      }
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating expense'
    });
  }
});

// Update expense
router.put('/:id', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    const { error } = expenseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    const expense = await Expense.findOne({ where: { id, userId } });
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Verify category belongs to user
    if (req.body.categoryId) {
      const category = await Category.findOne({
        where: { id: req.body.categoryId, userId }
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }
    }

    const updateData = { ...req.body };
    
    // Handle receipt update
    if (req.file) {
      updateData.receipt = `/uploads/${req.file.filename}`;
    }

    const updatedExpense = await expense.update(updateData);

    // Fetch updated expense with category details
    const result = await Expense.findByPk(updatedExpense.id, {
      include: [{
        model: Category,
        as: 'expenseCategory',
        attributes: ['id', 'name', 'color', 'icon']
      }]
    });

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: {
        expense: result
      }
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating expense'
    });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const expense = await Expense.findOne({ where: { id, userId } });
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    await expense.destroy();

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting expense'
    });
  }
});

// Get expense statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'monthly' } = req.query;

    let dateFormat;
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-%u';
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        break;
      case 'yearly':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    const stats = await Expense.sequelize.query(`
      SELECT 
        DATE_FORMAT(date, '${dateFormat}') as period,
        type,
        COUNT(*) as count,
        SUM(amount) as total,
        AVG(amount) as average
      FROM expenses 
      WHERE userId = :userId 
        AND date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY period, type
      ORDER BY period DESC, type
    `, {
      replacements: { userId },
      type: Expense.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        stats,
        period
      }
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expense statistics'
    });
  }
});

export default router;
