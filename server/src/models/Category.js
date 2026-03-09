import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    },
    comment: 'User-friendly category code like food, shopping'
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
  color: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '#3B82F6',
    validate: {
      is: [/^#([0-9A-F]{3}){1,2}$/i, /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/i] // Allow both HEX and HSL
    }
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('expense', 'income'),
    allowNull: false,
    defaultValue: 'expense'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'categories',
  timestamps: true
  // Temporarily disabled - will re-enable after data cleanup
  // indexes: [
  //   {
  //     unique: true,
  //     fields: ['userId', 'code'],
  //     name: 'categories_user_code_unique'
  //   }
  // ]
});

export default Category;
