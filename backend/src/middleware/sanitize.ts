import { Request, Response, NextFunction } from 'express';

/**
 * Strip all HTML tags from a string
 * This is a simple but effective XSS prevention for API inputs
 */
const stripHtml = (str: string): string => {
  // Remove all HTML tags
  let result = str.replace(/<[^>]*>/g, '');
  // Decode common HTML entities
  result = result
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  // Re-escape dangerous characters for output
  result = result
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return result;
};

/**
 * Recursively sanitize data to prevent XSS attacks
 */
const sanitize = (data: any): any => {
  if (typeof data === 'string') {
    return stripHtml(data);
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
