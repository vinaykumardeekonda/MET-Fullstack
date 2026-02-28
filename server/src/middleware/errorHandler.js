export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(val => val.message).join(', ');
    error = {
      success: false,
      message: 'Validation Error',
      details: message,
      statusCode: 400
    };
    return res.status(400).json(error);
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = err.errors.map(val => val.message).join(', ');
    error = {
      success: false,
      message: 'Duplicate Entry',
      details: message,
      statusCode: 400
    };
    return res.status(400).json(error);
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    error = {
      success: false,
      message: 'Foreign Key Constraint Error',
      details: 'Referenced resource does not exist',
      statusCode: 400
    };
    return res.status(400).json(error);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      success: false,
      message: 'Invalid token',
      statusCode: 401
    };
    return res.status(401).json(error);
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      success: false,
      message: 'Token expired',
      statusCode: 401
    };
    return res.status(401).json(error);
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      success: false,
      message: 'File too large',
      statusCode: 400
    };
    return res.status(400).json(error);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = {
      success: false,
      message: 'Too many files',
      statusCode: 400
    };
    return res.status(400).json(error);
  }

  // Default error
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
