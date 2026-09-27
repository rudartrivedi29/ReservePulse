import { z } from 'zod';

export const questionTypeEnum = z.enum(['text', 'textarea', 'select', 'checkbox', 'number']);

export const createQuestionSchema = z
  .object({
    questionText: z
      .string()
      .min(1, 'Question prompt cannot be empty')
      .max(1000, 'Question prompt cannot exceed 1000 characters'),
    questionType: questionTypeEnum.default('text'),
    options: z
      .array(z.string().min(1, 'Option value cannot be empty'))
      .default([]),
    isRequired: z.boolean().default(false),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.questionType === 'select') {
        return Array.isArray(data.options) && data.options.length >= 1;
      }
      return true;
    },
    {
      message: 'Select questions must include at least one option',
      path: ['options'],
    }
  );

export const updateQuestionSchema = z
  .object({
    questionText: z
      .string()
      .min(1, 'Question prompt cannot be empty')
      .max(1000, 'Question prompt cannot exceed 1000 characters')
      .optional(),
    questionType: questionTypeEnum.optional(),
    options: z
      .array(z.string().min(1, 'Option value cannot be empty'))
      .optional(),
    isRequired: z.boolean().optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.questionType === 'select' && data.options !== undefined) {
        return Array.isArray(data.options) && data.options.length >= 1;
      }
      return true;
    },
    {
      message: 'Select questions must include at least one option',
      path: ['options'],
    }
  );

export const reorderQuestionsSchema = z
  .object({
    questionIds: z
      .array(z.string().min(1, 'Question ID cannot be empty'))
      .optional(),
    orders: z
      .array(
        z.object({
          id: z.string().min(1, 'Question ID is required'),
          orderIndex: z.number().int().min(0),
        })
      )
      .optional(),
  })
  .refine((data) => Boolean(data.questionIds || data.orders), {
    message: 'Must provide either questionIds array or orders array for reordering',
  });

export type CreateQuestionInput = z.input<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.input<typeof updateQuestionSchema>;
export type ReorderQuestionsInput = z.input<typeof reorderQuestionsSchema>;
