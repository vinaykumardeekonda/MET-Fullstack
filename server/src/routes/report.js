import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { dateRangeSchema } from '../validators/index.js';
import { Expense, Category, Budget } from '../models/index.js';

const router = express.Router();

// Get comprehensive financial reports
router.get('/overview', authenticateToken, async (req, res) => {
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
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const replacements = { userId };

    if (startDate && endDate) {
      dateFilter = 'AND date BETWEEN :startDate AND :endDate';
      replacements.startDate = startDate;
      replacements.endDate = endDate;
    }

    // Get overall financial summary
    const [summary, monthlyTrend, categoryBreakdown] = await Promise.all([
      // Overall summary
      Expense.sequelize.query(`
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) * -1 + 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as net_balance
        FROM expenses 
        WHERE userId = :userId ${dateFilter}
      `, {
        replacements,
        type: Expense.sequelize.QueryTypes.SELECT
      }),

      // Monthly trend
      Expense.sequelize.query(`
        SELECT 
          DATE_FORMAT(date, '%Y-%m') as month,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          COUNT(*) as transactions
        FROM expenses 
        WHERE userId = :userId 
          AND date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(date, '%Y-%m')
        ORDER BY month DESC
      `, {
        replacements: { userId },
        type: Expense.sequelize.QueryTypes.SELECT
      }),

      // Category breakdown
      Expense.sequelize.query(`
        SELECT 
          c.name as category_name,
          c.color as category_color,
          c.type as category_type,
          COUNT(*) as transaction_count,
          SUM(e.amount) as total_amount,
          AVG(e.amount) as average_amount
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        WHERE e.userId = :userId ${dateFilter}
        GROUP BY e.categoryId, c.name, c.color, c.type
        ORDER BY total_amount DESC
      `, {
        replacements,
        type: Expense.sequelize.QueryTypes.SELECT
      })
    ]);

    res.json({
      success: true,
      data: {
        summary: summary[0],
        monthlyTrend,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error('Get reports overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating reports overview'
    });
  }
});

// Get expense vs income chart data
router.get('/income-expense', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'monthly', months = 12 } = req.query;

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

    const data = await Expense.sequelize.query(`
      SELECT 
        DATE_FORMAT(date, '${dateFormat}') as period,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        COUNT(*) as transactions
      FROM expenses 
      WHERE userId = :userId 
        AND date >= DATE_SUB(CURDATE(), INTERVAL :months MONTH)
      GROUP BY period
      ORDER BY period ASC
    `, {
      replacements: { userId, months: parseInt(months) },
      type: Expense.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        chartData: data,
        period
      }
    });
  } catch (error) {
    console.error('Get income-expense report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating income-expense report'
    });
  }
});

// Get category-wise spending report
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'expense', startDate, endDate } = req.query;

    let dateFilter = '';
    const replacements = { userId, type };

    if (startDate && endDate) {
      dateFilter = 'AND e.date BETWEEN :startDate AND :endDate';
      replacements.startDate = startDate;
      replacements.endDate = endDate;
    }

    const categoryData = await Expense.sequelize.query(`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        COUNT(e.id) as transaction_count,
        COALESCE(SUM(e.amount), 0) as total_amount,
        COALESCE(AVG(e.amount), 0) as average_amount,
        COALESCE(MIN(e.amount), 0) as min_amount,
        COALESCE(MAX(e.amount), 0) as max_amount,
        ROUND(
          (SUM(e.amount) * 100.0 / (SELECT SUM(amount) FROM expenses WHERE userId = :userId AND type = :type ${dateFilter})), 
          2
        ) as percentage_of_total
      FROM categories c
      LEFT JOIN expenses e ON c.id = e.categoryId AND e.type = :type AND e.userId = :userId ${dateFilter}
      WHERE c.userId = :userId AND c.type = :type
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY total_amount DESC
    `, {
      replacements,
      type: Expense.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        categories: categoryData,
        type
      }
    });
  } catch (error) {
    console.error('Get categories report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating categories report'
    });
  }
});

// Get budget performance report
router.get('/budgets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period } = req.query;

    const whereClause = { userId, isActive: true };
    if (period) {
      whereClause.period = period;
    }

    const budgets = await Budget.findAll({
      where: whereClause,
      include: [{
        model: Category,
        as: 'expenseCategory',
        attributes: ['id', 'name', 'color', 'icon', 'type']
      }]
    });

    // Calculate performance for each budget
    const budgetPerformance = await Promise.all(
      budgets.map(async (budget) => {
        const totalSpent = await Expense.sum('amount', {
          where: {
            userId,
            categoryId: budget.categoryId,
            type: 'expense',
            date: {
              [Expense.sequelize.Sequelize.Op.between]: [budget.startDate, budget.endDate]
            }
          }
        }) || 0;

        const remaining = parseFloat(budget.amount) - parseFloat(totalSpent);
        const percentageUsed = (parseFloat(totalSpent) / parseFloat(budget.amount)) * 100;

        let status = 'good';
        if (percentageUsed >= 100) {
          status = 'exceeded';
        } else if (percentageUsed >= parseFloat(budget.alertThreshold)) {
          status = 'warning';
        }

        return {
          ...budget.toJSON(),
          spent: parseFloat(totalSpent),
          remaining,
          percentageUsed: Math.round(percentageUsed * 100) / 100,
          status
        };
      })
    );

    // Calculate overall budget health
    const totalBudgetAmount = budgetPerformance.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const totalSpent = budgetPerformance.reduce((sum, b) => sum + parseFloat(b.spent), 0);
    const overallPercentage = totalBudgetAmount > 0 ? (totalSpent / totalBudgetAmount) * 100 : 0;

    res.json({
      success: true,
      data: {
        budgets: budgetPerformance,
        summary: {
          totalBudgets: budgetPerformance.length,
          totalBudgetAmount,
          totalSpent,
          overallPercentage: Math.round(overallPercentage * 100) / 100,
          exceededBudgets: budgetPerformance.filter(b => b.status === 'exceeded').length,
          warningBudgets: budgetPerformance.filter(b => b.status === 'warning').length,
          goodBudgets: budgetPerformance.filter(b => b.status === 'good').length
        }
      }
    });
  } catch (error) {
    console.error('Get budgets report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating budgets report'
    });
  }
});

// Get spending trends analysis
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'monthly', categoryId } = req.query;

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

    let categoryFilter = '';
    const replacements = { userId };

    if (categoryId) {
      categoryFilter = 'AND categoryId = :categoryId';
      replacements.categoryId = categoryId;
    }

    const trendData = await Expense.sequelize.query(`
      SELECT 
        DATE_FORMAT(date, '${dateFormat}') as period,
        type,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
      FROM expenses 
      WHERE userId = :userId 
        AND date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        ${categoryFilter}
      GROUP BY period, type
      ORDER BY period ASC, type
    `, {
      replacements,
      type: Expense.sequelize.QueryTypes.SELECT
    });

    // Process data to separate expenses and income
    const processedData = {};
    trendData.forEach(item => {
      if (!processedData[item.period]) {
        processedData[item.period] = { period };
      }
      processedData[item.period][item.type] = {
        count: item.transaction_count,
        total: parseFloat(item.total_amount),
        average: parseFloat(item.average_amount)
      };
    });

    res.json({
      success: true,
      data: {
        trends: Object.values(processedData),
        period,
        categoryId: categoryId || null
      }
    });
  } catch (error) {
    console.error('Get trends report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating trends report'
    });
  }
});

// Export data (CSV format)
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, startDate, endDate, categoryId } = req.query;

    let whereClause = { userId };
    if (type) whereClause.type = type;
    if (startDate && endDate) {
      whereClause.date = {
        [Expense.sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }
    if (categoryId) whereClause.categoryId = categoryId;

    const expenses = await Expense.findAll({
      where: whereClause,
      include: [{
        model: Category,
        as: 'expenseCategory',
        attributes: ['name', 'type']
      }],
      order: [['date', 'DESC']]
    });

    // Convert to CSV
    const csvHeaders = ['Date', 'Title', 'Description', 'Amount', 'Type', 'Category', 'Payment Method', 'Location', 'Tags'];
    const csvRows = expenses.map(expense => [
      expense.date,
      expense.title,
      expense.description || '',
      expense.amount,
      expense.type,
      expense.expenseCategory?.name || '',
      expense.paymentMethod || '',
      expense.location || '',
      expense.tags ? expense.tags.join(';') : ''
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting data'
    });
  }
});

export default router;
