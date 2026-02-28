import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Category, Expense, Budget } from '../models/index.js';

const router = express.Router();

// Get detailed category expense analysis
router.get('/:id/analysis', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { period = 'monthly', startDate, endDate } = req.query;

    // Verify category belongs to user
    const category = await Category.findOne({
      where: { id, userId },
      include: [{
        model: Budget,
        as: 'categoryBudgets',
        where: { isActive: true },
        required: false,
        attributes: ['id', 'amount', 'period', 'startDate', 'endDate', 'alertThreshold']
      }]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Determine date range
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        [Expense.sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    } else {
      // Default to current period
      const now = new Date();
      let periodStart, periodEnd;
      
      switch (period) {
        case 'weekly':
          periodStart = new Date(now.setDate(now.getDate() - 7));
          periodEnd = new Date();
          break;
        case 'monthly':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'yearly':
          periodStart = new Date(now.getFullYear(), 0, 1);
          periodEnd = new Date(now.getFullYear(), 11, 31);
          break;
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      dateFilter = {
        [Expense.sequelize.Sequelize.Op.between]: [periodStart, periodEnd]
      };
    }

    // Get all expenses in this category for the period
    const expenses = await Expense.findAll({
      where: {
        userId,
        categoryId: id,
        type: 'expense',
        date: dateFilter
      },
      attributes: ['id', 'title', 'amount', 'date', 'description'],
      order: [['date', 'DESC']]
    });

    // Calculate basic statistics
    const totalSpent = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const averageExpense = expenses.length > 0 ? totalSpent / expenses.length : 0;
    const transactionCount = expenses.length;

    // Get daily spending trend
    const dailySpending = {};
    expenses.forEach(expense => {
      const date = expense.date.toISOString().split('T')[0];
      dailySpending[date] = (dailySpending[date] || 0) + parseFloat(expense.amount);
    });

    // Get weekly spending trend
    const weeklySpending = {};
    expenses.forEach(expense => {
      const weekStart = new Date(expense.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklySpending[weekKey] = (weeklySpending[weekKey] || 0) + parseFloat(expense.amount);
    });

    // Find highest and lowest expenses
    const highestExpense = expenses.length > 0 
      ? expenses.reduce((max, expense) => parseFloat(expense.amount) > parseFloat(max.amount) ? expense : max)
      : null;
    const lowestExpense = expenses.length > 0
      ? expenses.reduce((min, expense) => parseFloat(expense.amount) < parseFloat(min.amount) ? expense : min)
      : null;

    // Get budget performance if budget exists
    let budgetPerformance = null;
    if (category.categoryBudgets && category.categoryBudgets.length > 0) {
      const budget = category.categoryBudgets[0];
      const budgetAmount = parseFloat(budget.amount);
      const remaining = budgetAmount - totalSpent;
      const percentageUsed = (totalSpent / budgetAmount) * 100;
      
      let status = 'good';
      if (percentageUsed >= 100) {
        status = 'exceeded';
      } else if (percentageUsed >= parseFloat(budget.alertThreshold)) {
        status = 'warning';
      }

      budgetPerformance = {
        budgetId: budget.id,
        budgetAmount,
        spent: totalSpent,
        remaining,
        percentageUsed: Math.round(percentageUsed * 100) / 100,
        status,
        alertThreshold: parseFloat(budget.alertThreshold)
      };
    }

    // Get month-over-month comparison (if monthly period)
    let monthlyComparison = null;
    if (period === 'monthly') {
      const currentMonth = new Date();
      const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      const previousMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);

      const previousMonthExpenses = await Expense.sum('amount', {
        where: {
          userId,
          categoryId: id,
          type: 'expense',
          date: {
            [Expense.sequelize.Sequelize.Op.between]: [previousMonth, previousMonthEnd]
          }
        }
      }) || 0;

      const changeAmount = totalSpent - previousMonthExpenses;
      const changePercentage = previousMonthExpenses > 0 
        ? ((changeAmount / previousMonthExpenses) * 100) 
        : 0;

      monthlyComparison = {
        currentMonth: totalSpent,
        previousMonth: previousMonthExpenses,
        changeAmount,
        changePercentage: Math.round(changePercentage * 100) / 100,
        trend: changeAmount > 0 ? 'increase' : changeAmount < 0 ? 'decrease' : 'same'
      };
    }

    res.json({
      success: true,
      data: {
        category: {
          id: category.id,
          name: category.name,
          color: category.color,
          icon: category.icon,
          type: category.type
        },
        period: {
          type: period,
          startDate: dateFilter[Expense.sequelize.Sequelize.Op.between] 
            ? dateFilter[Expense.sequelize.Sequelize.Op.between][0]
            : startDate,
          endDate: dateFilter[Expense.sequelize.Sequelize.Op.between]
            ? dateFilter[Expense.sequelize.Sequelize.Op.between][1]
            : endDate
        },
        summary: {
          totalSpent: Math.round(totalSpent * 100) / 100,
          averageExpense: Math.round(averageExpense * 100) / 100,
          transactionCount,
          highestExpense: highestExpense ? {
            id: highestExpense.id,
            title: highestExpense.title,
            amount: parseFloat(highestExpense.amount),
            date: highestExpense.date
          } : null,
          lowestExpense: lowestExpense ? {
            id: lowestExpense.id,
            title: lowestExpense.title,
            amount: parseFloat(lowestExpense.amount),
            date: lowestExpense.date
          } : null
        },
        trends: {
          daily: Object.entries(dailySpending).map(([date, amount]) => ({
            date,
            amount: Math.round(amount * 100) / 100
          })).sort((a, b) => new Date(a.date) - new Date(b.date)),
          weekly: Object.entries(weeklySpending).map(([week, amount]) => ({
            week,
            amount: Math.round(amount * 100) / 100
          })).sort((a, b) => new Date(a.week) - new Date(b.week))
        },
        budgetPerformance,
        monthlyComparison,
        recentExpenses: expenses.slice(0, 10).map(expense => ({
          id: expense.id,
          title: expense.title,
          amount: parseFloat(expense.amount),
          date: expense.date,
          description: expense.description
        }))
      }
    });
  } catch (error) {
    console.error('Category analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while analyzing category'
    });
  }
});

export default router;
