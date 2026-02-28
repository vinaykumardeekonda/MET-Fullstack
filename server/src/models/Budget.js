import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Budget = sequelize.define('Budget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100],
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      notEmpty: true
    }
  },
  spent: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  period: {
    type: DataTypes.ENUM('weekly', 'monthly', 'yearly'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true,
      notEmpty: true
    }
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true,
      notEmpty: true
    }
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: true, // null for overall budget
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  alertThreshold: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 80,
    validate: {
      min: 0,
      max: 100
    }
  }
}, {
  tableName: 'budgets',
  timestamps: true
});

export default Budget;
