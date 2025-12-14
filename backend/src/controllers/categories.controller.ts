import { Request, Response } from 'express';
import { z } from 'zod';
import { db, categories } from '../db/index.js';
import { eq } from 'drizzle-orm';

const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100),
  description: z.string().optional(),
  icon: z.string().max(50).optional(),
});

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categoriesList = await db.query.categories.findMany({
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });

    res.json(categoriesList);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const data = createCategorySchema.parse(req.body);

    const [category] = await db.insert(categories).values(data).returning();

    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
