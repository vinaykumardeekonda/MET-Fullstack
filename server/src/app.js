import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables FIRST
dotenv.config();

// Import database connection
import { sequelize } from './config/database.js';
import './config/associations.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import categoryRoutes from './routes/category.js';
import expenseRoutes from './routes/expense.js';
import budgetRoutes from './routes/budget.js';
import reportRoutes from './routes/report.js';
import categoryAnalysisRoutes from './routes/categoryAnalysis.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:8080', 'http://localhost:8081'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Monthly Expense Tracker API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/categories', categoryAnalysisRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Database connection and server start
const startServer = async () => {
  try {
    // Test DB connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    console.log('🔄 Synchronizing database (safe mode)...');

    // SAFE SYNC (does not delete data)
    await sequelize.sync({
      alter: true,
      logging: false
    });

    console.log('📊 Database synchronized successfully.');

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start server
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

export default app;