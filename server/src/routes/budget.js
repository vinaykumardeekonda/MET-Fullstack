import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { budgetSchema, dateRangeSchema } from '../validators/index.js';
import { Budget, Category, Expense } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';

const router = express.Router();

// Get all budgets for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { isActive, period } = req.query;

    const whereClause = { userId };
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }
    if (period) {
      whereClause.period = period;
    }

    const budgets = await Budget.findAll({
      where: whereClause,
      include: [{
        model: Category,
        as: 'budgetCategory',
        attributes: ['id', 'name', 'color', 'icon', 'type']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        budgets
      }
    });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching budgets'
    });
  }
});

// Get budget by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const budget = await Budget.findOne({
      where: { id, userId },
      include: [{
        model: Category,
        as: 'budgetCategory',
        attributes: ['id', 'name', 'color', 'icon', 'type']
      }]
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Calculate actual spent amount
    const spentAmount = await Expense.sum('amount', {
      where: {
        userId,
        categoryId: budget.categoryId,
        type: 'expense',
        date: {
          [Expense.sequelize.Sequelize.Op.between]: [budget.startDate, budget.endDate]
        }
      }
    }) || 0;

    // Update budget with current spent amount
    const budgetWithSpent = {
      ...budget.toJSON(),
      spent: parseFloat(spentAmount),
      remaining: parseFloat(budget.amount) - parseFloat(spentAmount),
      percentageUsed: (parseFloat(spentAmount) / parseFloat(budget.amount)) * 100
    };

    res.json({
      success: true,
      data: {
        budget: budgetWithSpent
      }
    });
  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching budget'
    });
  }
});

// Create new budget
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('Budget creation request body:', req.body);
    
    const { error } = budgetSchema.validate(req.body);
    if (error) {
      console.log('Validation error details:', error.details);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { categoryId } = req.body;
    const userId = req.user.id;

    // Validate that if categoryId is provided, it exists for this user
    if (categoryId && categoryId !== "overall") {
      const category = await Category.findOne({
        where: { code: categoryId, userId }
      });
      
      if (!category) {
        console.log(`❌ Category ${categoryId} not found for user ${userId}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid category',
          details: `Category with code "${categoryId}" does not exist for this user`
        });
      }
      
      console.log(`✅ Category ${categoryId} found: ${category.name}`);
      
      // Convert category code to actual category ID for storage
      req.body.categoryId = category.id;
    } else {
      console.log('🔍 Setting categoryId to null for overall budget');
      req.body.categoryId = null;
    }

    const budgetData = {
      ...req.body,
      userId
    };

    const budget = await Budget.create(budgetData);

    // Fetch created budget with category details
    const createdBudget = await Budget.findByPk(budget.id, {
      include: [{
        model: Category,
        as: 'budgetCategory',
        attributes: ['id', 'name', 'color', 'icon', 'type']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: {
        budget: createdBudget
      }
    });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating budget'
    });
  }
});

// Update budget
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = budgetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const { categoryId } = req.body;

    const budget = await Budget.findOne({ where: { id, userId } });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Verify category belongs to user if provided
    if (categoryId) {
      const category = await Category.findOne({
        where: { 
          [Op.or]: [
            { id: categoryId, userId },
            { code: categoryId, userId }
          ]
        }
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }

      // Replace category code with category ID for database consistency
      req.body.categoryId = category.id;
    }

    const updatedBudget = await budget.update(req.body);

    // Fetch updated budget with category details
    const result = await Budget.findByPk(updatedBudget.id, {
      include: [{
        model: Category,
        as: 'budgetCategory',
        attributes: ['id', 'name', 'color', 'icon', 'type']
      }]
    });

    res.json({
      success: true,
      message: 'Budget updated successfully',
      data: {
        budget: result
      }
    });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating budget'
    });
  }
});

// Delete budget
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const budget = await Budget.findOne({ where: { id, userId } });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    await budget.destroy();

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting budget'
    });
  }
});

// Get budget performance/usage
router.get('/:id/performance', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const budget = await Budget.findOne({
      where: { id, userId },
      include: [{
        model: Category,
        as: 'budgetCategory',
        attributes: ['id', 'name', 'color', 'icon', 'type']
      }]
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Get expenses within budget period
    let expenses;
    
    if (budget.categoryId) {
      // Category-specific budget: only expenses from this category
      expenses = await Expense.findAll({
        where: {
          userId,
          categoryId: budget.categoryId,
          type: 'expense',
          date: {
            [Expense.sequelize.Sequelize.Op.between]: [budget.startDate, budget.endDate]
          }
        },
        attributes: ['id', 'title', 'amount', 'date'],
        order: [['date', 'DESC']]
      });
    } else {
      // Overall budget: all expenses regardless of category
      expenses = await Expense.findAll({
        where: {
          userId,
          type: 'expense',
          date: {
            [Expense.sequelize.Sequelize.Op.between]: [budget.startDate, budget.endDate]
          }
        },
        attributes: ['id', 'title', 'amount', 'date'],
        order: [['date', 'DESC']]
      });
    }

    const totalSpent = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const remaining = parseFloat(budget.amount) - totalSpent;
    const percentageUsed = (totalSpent / parseFloat(budget.amount)) * 100;

    // Determine status
    let status = 'good';
    if (percentageUsed >= 100) {
      status = 'exceeded';
    } else if (percentageUsed >= parseFloat(budget.alertThreshold)) {
      status = 'warning';
    }

    res.json({
      success: true,
      data: {
        budget,
        performance: {
          totalSpent,
          remaining,
          percentageUsed: Math.round(percentageUsed * 100) / 100,
          status,
          expenses,
          expenseCount: expenses.length
        }
      }
    });
  } catch (error) {
    console.error('Get budget performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching budget performance'
    });
  }
});

// Get all budgets with their current performance
router.get('/performance/summary', authenticateToken, async (req, res) => {
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
        as: 'budgetCategory',
        attributes: ['id', 'name', 'color', 'icon', 'type']
      }]
    });

    // Calculate performance for each budget
    const budgetsWithPerformance = await Promise.all(
      budgets.map(async (budget) => {
        let totalSpent;
        
        if (budget.categoryId) {
          // Category-specific budget: only expenses from this category
          totalSpent = await Expense.sum('amount', {
            where: {
              userId,
              categoryId: budget.categoryId,
              type: 'expense',
              date: {
                [Expense.sequelize.Sequelize.Op.between]: [budget.startDate, budget.endDate]
              }
            }
          }) || 0;
        } else {
          // Overall budget: all expenses regardless of category
          totalSpent = await Expense.sum('amount', {
            where: {
              userId,
              type: 'expense',
              date: {
                [Expense.sequelize.Sequelize.Op.between]: [budget.startDate, budget.endDate]
              }
            }
          }) || 0;
        }

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

    res.json({
      success: true,
      data: {
        budgets: budgetsWithPerformance
      }
    });
  } catch (error) {
    console.error('Get budgets performance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching budgets performance summary'
    });
  }
});

export default router;
