import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(),

  REDIS_URL: Joi.string().uri().required(),
  REDIS_REFRESH_TOKEN_TTL: Joi.number().positive().default(604800),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.number().positive().default(900),
  JWT_REFRESH_TTL: Joi.number().positive().default(604800),

  REFRESH_TOKEN_MAX_AGE_MS: Joi.number().positive().default(604800000),

  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  THROTTLE_TTL_MS: Joi.number().positive().default(60000),
  THROTTLE_LIMIT: Joi.number().positive().default(10),
});
