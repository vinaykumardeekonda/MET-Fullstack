# Monthly Expense Tracker Backend

Backend API for the Monthly Expense Tracker application built with Node.js, Express.js, and MySQL.

## Features

- **Authentication**: JWT-based authentication with password reset functionality
- **User Management**: Profile management and settings
- **Expense Tracking**: CRUD operations for expenses with file upload support
- **Category Management**: Organize expenses by custom categories
- **Budget Management**: Set and track budgets with alerts
- **Reporting & Analytics**: Comprehensive financial reports and data export
- **Security**: Rate limiting, input validation, and security headers
- **File Upload**: Support for receipt images and documents

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT tokens
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer
- **Logging**: Morgan

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
copy .env.example .env
```

3. Configure your environment variables in `.env`:
- Database connection details
- JWT secret
- Email configuration (for password reset)
- File upload settings

4. Make sure your MySQL server is running and the database exists.

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Categories
- `GET /api/categories` - Get user categories
- `POST /api/categories` - Create category
- `GET /api/categories/:id` - Get category details
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category
- `GET /api/categories/:id/stats` - Get category statistics

### Expenses
- `GET /api/expenses` - Get expenses with pagination and filtering
- `POST /api/expenses` - Create expense (with file upload)
- `GET /api/expenses/:id` - Get expense details
- `PUT /api/expenses/:id` - Update expense (with file upload)
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/expenses/stats/summary` - Get expense statistics

### Budgets
- `GET /api/budgets` - Get budgets
- `POST /api/budgets` - Create budget
- `GET /api/budgets/:id` - Get budget details
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget
- `GET /api/budgets/:id/performance` - Get budget performance
- `GET /api/budgets/performance/summary` - Get all budgets performance

### Reports
- `GET /api/reports/overview` - Get comprehensive financial overview
- `GET /api/reports/income-expense` - Get income vs expense chart data
- `GET /api/reports/categories` - Get category-wise spending report
- `GET /api/reports/budgets` - Get budget performance report
- `GET /api/reports/trends` - Get spending trends analysis
- `GET /api/reports/export` - Export data as CSV

### Users
- `GET /api/users/stats` - Get user statistics
- `GET /api/users/activity` - Get user's recent activity

## Security Features

- JWT authentication with expiration
- Rate limiting on sensitive endpoints
- Input validation with Joi
- SQL injection prevention with Sequelize ORM
- File upload validation and size limits
- Security headers with Helmet
- CORS configuration

## Database Schema

The application uses the following main tables:
- `users` - User accounts and profiles
- `categories` - Expense/income categories
- `expenses` - Individual expense/income records
- `budgets` - Budget tracking and limits

## Error Handling

All API responses follow a consistent format:
```json
{
  "success": true/false,
  "message": "Description",
  "data": { ... }
}
```

## Development

The server runs on port 5000 by default and includes:
- Hot reload with nodemon
- Detailed logging with Morgan
- Development database synchronization
- Comprehensive error handling

## Production Considerations

- Use environment-specific configuration
- Implement proper email service for password reset
- Set up file storage (AWS S3, etc.)
- Configure proper CORS for your domain
- Use HTTPS in production
- Set up database connection pooling
- Implement proper logging and monitoring
