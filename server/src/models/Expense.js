import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      notEmpty: true
    }
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true,
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.ENUM('expense', 'income'),
    allowNull: false,
    defaultValue: 'expense'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'bank_transfer', 'digital_wallet', 'other'),
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  recurrenceInterval: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'),
    allowNull: true
  },
  receipt: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'expenses',
  timestamps: true
});

export default Expense;
