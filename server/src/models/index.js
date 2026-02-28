import User from './User.js';
import Category from './Category.js';
import Expense from './Expense.js';
import Budget from './Budget.js';

// Define associations
const setupAssociations = () => {
  // User has many Categories
  User.hasMany(Category, {
    foreignKey: 'userId',
    as: 'categories',
    onDelete: 'CASCADE'
  });
  Category.belongsTo(User, {
    foreignKey: 'userId',
    as: 'categoryUser'
  });

  // User has many Expenses
  User.hasMany(Expense, {
    foreignKey: 'userId',
    as: 'expenses',
    onDelete: 'CASCADE'
  });
  Expense.belongsTo(User, {
    foreignKey: 'userId',
    as: 'expenseUser'
  });

  // Category has many Expenses
  Category.hasMany(Expense, {
    foreignKey: 'categoryId',
    as: 'categoryExpenses',
    onDelete: 'CASCADE'
  });
  Expense.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'expenseCategory'
  });

  // User has many Budgets
  User.hasMany(Budget, {
    foreignKey: 'userId',
    as: 'budgets',
    onDelete: 'CASCADE'
  });
  Budget.belongsTo(User, {
    foreignKey: 'userId',
    as: 'budgetUser'
  });

  // Category has many Budgets
  Category.hasMany(Budget, {
    foreignKey: 'categoryId',
    as: 'categoryBudgets',
    onDelete: 'SET NULL'
  });
  Budget.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'budgetCategory'
  });
};

export { User, Category, Expense, Budget, setupAssociations };
