import winston from 'winston';

const isDevelopment = process.env.NODE_ENV === 'development';

const loggerTransports = [
  new winston.transports.File({ filename: 'error.log', level: 'error' }),
  new winston.transports.File({ filename: 'combined.log' }),
];

if (isDevelopment) {
  loggerTransports.push(new winston.transports.Console());
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: loggerTransports,
});

export default logger; 