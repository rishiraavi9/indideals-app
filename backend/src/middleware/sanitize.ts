import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Recursively sanitize data to prevent XSS attacks
 */
const sanitize = (data: any): any => {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data, {
      ALLOWED_TAGS: [], // Strip all HTML tags
      ALLOWED_ATTR: [], // Strip all attributes
    });
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).reduce((acc, key) => {
      acc[key] = sanitize(data[key]);
      return acc;
    }, {} as any);
  }

  return data;
};

/**
 * Middleware to sanitize all user inputs (body, query)
 */
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitize(req.body);
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
};
