import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { dateRangeSchema } from '../validators/index.js';
import { User, Category } from '../models/index.js';

const router = express.Router();

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get total expenses and income
    const [expenseStats, incomeStats] = await Promise.all([
      User.sequelize.query(`
        SELECT 
          COUNT(*) as total_expenses,
          COALESCE(SUM(amount), 0) as total_spent,
          COALESCE(AVG(amount), 0) as avg_expense
        FROM expenses 
        WHERE userId = :userId AND type = 'expense'
      `, {
        replacements: { userId },
        type: User.sequelize.QueryTypes.SELECT
      }),
      User.sequelize.query(`
        SELECT 
          COUNT(*) as total_income,
          COALESCE(SUM(amount), 0) as total_earned,
          COALESCE(AVG(amount), 0) as avg_income
        FROM expenses 
        WHERE userId = :userId AND type = 'income'
      `, {
        replacements: { userId },
        type: User.sequelize.QueryTypes.SELECT
      })
    ]);

    // Get category counts
    const categoryStats = await Category.findAll({
      where: { userId },
      attributes: [
        'type',
        [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        expenses: expenseStats[0],
        income: incomeStats[0],
        categories: {
          expense: categoryStats.find(s => s.type === 'expense')?.count || 0,
          income: categoryStats.find(s => s.type === 'income')?.count || 0
        }
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user statistics'
    });
  }
});

// Get user's recent activity
router.get('/activity', authenticateToken, async (req, res) => {
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
    const { startDate, endDate, limit = 10 } = req.query;

    let dateFilter = '';
    const replacements = { userId, limit: parseInt(limit) };

    if (startDate && endDate) {
      dateFilter = 'AND e.date BETWEEN :startDate AND :endDate';
      replacements.startDate = startDate;
      replacements.endDate = endDate;
    }

    const activities = await User.sequelize.query(`
      SELECT 
        e.id,
        e.title,
        e.amount,
        e.type,
        e.date,
        c.name as category_name,
        c.color as category_color,
        e.createdAt
      FROM expenses e
      LEFT JOIN categories c ON e.categoryId = c.id
      WHERE e.userId = :userId ${dateFilter}
      ORDER BY e.createdAt DESC
      LIMIT :limit
    `, {
      replacements,
      type: User.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        activities
      }
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user activity'
    });
  }
});

export default router;
