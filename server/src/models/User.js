import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [3, 50],
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [6, 255],
      notEmpty: true
    }
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [1, 50],
      notEmpty: true
    }
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [1, 50],
      notEmpty: true
    }
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  passwordResetToken: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
    validate: {
      isIn: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']
    }
  }
}, {
  tableName: 'users',
  timestamps: true
});

export default User;
