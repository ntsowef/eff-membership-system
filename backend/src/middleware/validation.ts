import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './errorHandler';

// Simple validation middleware for request body
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      res.status(400).json({
        success: false,
        message: 'Validation error',
        error: {
          code: 'VALIDATION_ERROR',
          message: errorMessage,
          details: error.details
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

// Validation middleware factory
export const validate = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => `Body: ${detail.message}`));
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => `Query: ${detail.message}`));
      }
    }

    // Validate route parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => `Params: ${detail.message}`));
      }
    }

    // If validation errors exist, throw validation error
    if (errors.length > 0) {
      const errorMessage = `Validation failed: ${errors.join(', ')}`;
      throw new ValidationError(errorMessage, { errors });
    }

    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  // Pagination parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('firstname', 'surname', 'age', 'id_number', 'member_id', 'date_joined', 'created_at').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }),

  // ID parameter
  id: Joi.object({
    id: Joi.number().integer().positive().required()
  }),

  // Code parameter (for geographic codes)
  code: Joi.object({
    code: Joi.string().alphanum().min(2).max(20).required()
  }),

  // Ward code parameter
  wardCode: Joi.object({
    wardCode: Joi.string().min(5).max(15).required()
  }),

  // Province code parameter
  provinceCode: Joi.object({
    provinceCode: Joi.string().min(2).max(3).required()
  }),

  // District code parameter
  districtCode: Joi.object({
    districtCode: Joi.string().min(3).max(10).required()
  }),

  // Municipality code parameter
  municipalityCode: Joi.object({
    municipalityCode: Joi.string().min(3).max(10).required()
  }),

  // Member ID parameter
  memberId: Joi.object({
    memberId: Joi.number().integer().positive().required()
  }),

  // Category ID parameter
  categoryId: Joi.object({
    categoryId: Joi.number().integer().positive().required()
  }),

  // Search query
  search: Joi.object({
    q: Joi.string().min(1).max(100).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

// Member validation schemas
export const memberSchemas = {
  create: Joi.object({
    id_number: Joi.string().length(13).pattern(/^\d{13}$/).required()
      .messages({
        'string.length': 'ID number must be exactly 13 digits',
        'string.pattern.base': 'ID number must contain only digits'
      }),
    firstname: Joi.string().min(1).max(50).required(),
    surname: Joi.string().min(1).max(50).optional(),
    gender_id: Joi.number().integer().min(1).max(3).required(),
    race_id: Joi.number().integer().min(1).max(5).optional(),
    citizenship_id: Joi.number().integer().min(1).max(2).default(1),
    language_id: Joi.number().integer().min(1).max(11).optional(),
    ward_code: Joi.string().min(5).max(15).required(),
    voting_station_id: Joi.number().integer().positive().optional(),
    residential_address: Joi.string().max(500).optional(),
    cell_number: Joi.string().pattern(/^(\+27|27|0)[6-8]\d{8}$/).optional()
      .messages({
        'string.pattern.base': 'Cell number must be a valid South African mobile number'
      }),
    landline_number: Joi.string().pattern(/^(\+27|0)\d{9}$/).optional().allow(null)
      .messages({
        'string.pattern.base': 'Landline number must be a valid South African number'
      }),
    email: Joi.string().email().max(100).optional().allow(''),
    occupation_id: Joi.number().integer().positive().optional(),
    qualification_id: Joi.number().integer().min(1).max(11).optional()
  }),

  update: Joi.object({
    firstname: Joi.string().min(1).max(50).optional(),
    surname: Joi.string().min(1).max(50).optional(),
    gender_id: Joi.number().integer().min(1).max(3).optional(),
    race_id: Joi.number().integer().min(1).max(5).optional(),
    citizenship_id: Joi.number().integer().min(1).max(2).optional(),
    language_id: Joi.number().integer().min(1).max(11).optional(),
    ward_code: Joi.string().min(5).max(15).optional(),
    voting_station_id: Joi.number().integer().positive().optional(),
    residential_address: Joi.string().max(500).optional(),
    cell_number: Joi.string().optional(),
    landline_number: Joi.string().pattern(/^(\+27|0)\d{9}$/).optional().allow(null),
    email: Joi.string().email().max(100).optional().allow(''),
    occupation_id: Joi.number().integer().positive().optional(),
    qualification_id: Joi.number().integer().min(1).max(11).optional()
  }).min(1).unknown(true) // At least one field must be provided for update, allow unknown fields
};

// Membership validation schemas
export const membershipSchemas = {
  create: Joi.object({
    member_id: Joi.number().integer().positive().required(),
    date_joined: Joi.date().iso().required(),
    last_payment_date: Joi.date().iso().optional(),
    expiry_date: Joi.date().iso().optional(),
    subscription_type_id: Joi.number().integer().min(1).max(2).required(),
    membership_amount: Joi.number().precision(2).min(0).max(99999.99).default(10.00),
    status_id: Joi.number().integer().min(1).max(5).default(1),
    payment_method: Joi.string().max(20).optional(),
    payment_reference: Joi.string().max(50).optional()
  }),

  update: Joi.object({
    last_payment_date: Joi.date().iso().optional(),
    expiry_date: Joi.date().iso().optional(),
    subscription_type_id: Joi.number().integer().min(1).max(2).optional(),
    membership_amount: Joi.number().precision(2).min(0).max(99999.99).optional(),
    status_id: Joi.number().integer().min(1).max(5).optional(),
    payment_method: Joi.string().max(20).optional(),
    payment_reference: Joi.string().max(50).optional()
  }).min(1)
};

// Voting station validation schemas
export const votingStationSchemas = {
  create: Joi.object({
    station_code: Joi.string().max(20).optional(),
    station_name: Joi.string().max(100).required(),
    ward_code: Joi.string().min(5).max(15).required(),
    address: Joi.string().max(500).optional(),
    is_active: Joi.boolean().default(true)
  }),

  update: Joi.object({
    station_code: Joi.string().max(20).optional(),
    station_name: Joi.string().max(100).optional(),
    ward_code: Joi.string().min(5).max(15).optional(),
    address: Joi.string().max(500).optional(),
    is_active: Joi.boolean().optional()
  }).min(1)
};

// Date range validation
export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
});

// Filter validation for member queries
export const memberFilterSchema = Joi.object({
  ward_code: Joi.string().min(5).max(15).optional(),
  municipality_code: Joi.string().min(3).max(10).optional(),
  municipal_code: Joi.string().min(3).max(10).optional(), // Support both naming conventions
  district_code: Joi.string().min(3).max(10).optional(),
  province_code: Joi.string().min(2).max(3).optional(),
  gender_id: Joi.number().integer().min(1).max(3).optional(),
  race_id: Joi.number().integer().min(1).max(5).optional(),
  age_min: Joi.number().integer().min(0).max(120).optional(),
  age_max: Joi.number().integer().min(Joi.ref('age_min')).max(120).optional(),
  status_id: Joi.number().integer().min(1).max(5).optional(),
  has_email: Joi.boolean().optional(),
  has_cell_number: Joi.boolean().optional(),
  q: Joi.string().min(1).max(100).optional() // Add search parameter
}).concat(commonSchemas.pagination);
