import crypto from 'crypto';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { QuestionEntity, QuestionResponse } from '../models/question.model';
import { ServiceService } from './service.service';
import type { AuthUserPayload } from '../middleware/auth.middleware';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
  ReorderQuestionsInput,
} from '../validators/question.validator';

const inMemoryQuestions: Map<string, QuestionEntity[]> = new Map();

// Seed demo questions for services
const seedDemoQuestions = () => {
  if (inMemoryQuestions.size > 0) return;

  const demo: Record<string, Omit<QuestionEntity, 'created_at' | 'updated_at'>[]> = {
    srv_comp_001: [
      {
        id: 'qst_comp_001',
        service_id: 'srv_comp_001',
        question_text: 'Target Deep Learning Framework & CUDA Version',
        question_type: 'text',
        options: [],
        is_required: true,
        order_index: 1,
      },
      {
        id: 'qst_comp_002',
        service_id: 'srv_comp_001',
        question_text: 'Dataset Storage Volume (GB) / Scratch Disk Requirements',
        question_type: 'number',
        options: [],
        is_required: false,
        order_index: 2,
      },
      {
        id: 'qst_comp_003',
        service_id: 'srv_comp_001',
        question_text: 'SSH Public Key or Secure Container Registry URL',
        question_type: 'textarea',
        options: [],
        is_required: true,
        order_index: 3,
      },
    ],
    srv_suite_002: [
      {
        id: 'qst_suite_001',
        service_id: 'srv_suite_002',
        question_text: 'Session Purpose / Meeting Objective',
        question_type: 'text',
        options: [],
        is_required: true,
        order_index: 1,
      },
      {
        id: 'qst_suite_002',
        service_id: 'srv_suite_002',
        question_text: 'Telepresence & Presentation Setup Mode',
        question_type: 'select',
        options: [
          'Dual 4K Presentation Mode',
          'Hybrid Video Conference (Zoom/Teams)',
          'Acoustic Silence / Recording Only',
        ],
        is_required: false,
        order_index: 2,
      },
      {
        id: 'qst_suite_003',
        service_id: 'srv_suite_002',
        question_text: 'Concierge Hospitality & Beverage Service',
        question_type: 'select',
        options: [
          'Espresso Bar & Artisan Pastries',
          'Standard Water & Beverage Refreshments',
          'None Required',
        ],
        is_required: false,
        order_index: 3,
      },
    ],
    srv_boardroom_exec: [
      {
        id: 'qst_001',
        service_id: 'srv_boardroom_exec',
        question_text: 'What is the meeting agenda or presentation title?',
        question_type: 'text',
        options: [],
        is_required: true,
        order_index: 1,
      },
      {
        id: 'qst_002',
        service_id: 'srv_boardroom_exec',
        question_text: 'Required display and telepresence setup',
        question_type: 'select',
        options: [
          'Dual 4K Presentation Mode',
          'Zoom / Teams Hybrid Conference',
          'Audio Recording Only',
        ],
        is_required: false,
        order_index: 2,
      },
    ],
    srv_gpu_training: [
      {
        id: 'qst_003',
        service_id: 'srv_gpu_training',
        question_text: 'Base Docker container or PyTorch runtime tag',
        question_type: 'text',
        options: [],
        is_required: true,
        order_index: 1,
      },
    ],
    srv_consultation_private: [
      {
        id: 'qst_004',
        service_id: 'srv_consultation_private',
        question_text: 'Brief topic description for advisory preparation',
        question_type: 'textarea',
        options: [],
        is_required: false,
        order_index: 1,
      },
    ],
  };

  const now = new Date();
  for (const [srvId, qList] of Object.entries(demo)) {
    inMemoryQuestions.set(
      srvId,
      qList.map((q) => ({
        ...q,
        created_at: now,
        updated_at: now,
      }))
    );
  }

  logger.info('In-memory intake questions initialized', { count: Object.keys(demo).length });
};

seedDemoQuestions();

export class QuestionService {
  private static async isDbConnected(): Promise<boolean> {
    try {
      const res = await db.query('SELECT 1');
      return Boolean(res);
    } catch {
      return false;
    }
  }

  /**
   * Ensure requesting user is authorized to manage questions for this service
   */
  private static async verifyServiceAccess(serviceId: string, user?: AuthUserPayload): Promise<void> {
    const service = await ServiceService.getServiceById(serviceId);
    if (!service) {
      throw new NotFoundError(`Service with ID "${serviceId}" does not exist`);
    }
    if (user && user.role !== 'ADMIN' && service.organiserId !== user.id) {
      throw new ForbiddenError('You do not have permission to manage questions for this service');
    }
  }

  public static formatQuestion(entity: QuestionEntity): QuestionResponse {
    let options: string[] = [];
    if (Array.isArray(entity.options)) {
      options = entity.options;
    } else if (typeof entity.options === 'string') {
      try {
        options = JSON.parse(entity.options);
      } catch {
        options = [];
      }
    }

    return {
      id: entity.id,
      serviceId: entity.service_id,
      questionText: entity.question_text,
      questionType: entity.question_type,
      options,
      isRequired: entity.is_required,
      orderIndex: entity.order_index,
    };
  }

  /**
   * 1. Retrieve all questions for a service, sorted by order_index
   */
  public static async getQuestionsForService(serviceId: string): Promise<QuestionResponse[]> {
    if (await this.isDbConnected()) {
      try {
        const res = await db.query<QuestionEntity>(
          `SELECT * FROM questions WHERE service_id = $1 ORDER BY order_index ASC, created_at ASC`,
          [serviceId]
        );
        return res.rows.map(this.formatQuestion);
      } catch (err) {
        logger.warn('Failed to query questions from DB, using in-memory store', { error: err });
      }
    }

    // In-memory fallback
    if (!inMemoryQuestions.has(serviceId)) {
      inMemoryQuestions.set(serviceId, []);
    }

    const list = inMemoryQuestions.get(serviceId) || [];
    return [...list]
      .sort((a, b) => a.order_index - b.order_index)
      .map(this.formatQuestion);
  }

  /**
   * 2. Retrieve a single question by ID
   */
  public static async getQuestionById(serviceId: string, questionId: string): Promise<QuestionResponse> {
    if (await this.isDbConnected()) {
      try {
        const res = await db.query<QuestionEntity>(
          `SELECT * FROM questions WHERE id = $1 AND service_id = $2`,
          [questionId, serviceId]
        );
        if (res.rows.length > 0) {
          return this.formatQuestion(res.rows[0]);
        }
      } catch (err) {
        logger.warn('Failed to query single question from DB, checking in-memory store', { error: err });
      }
    }

    const list = inMemoryQuestions.get(serviceId) || [];
    const question = list.find((q) => q.id === questionId);
    if (!question) {
      throw new NotFoundError(`Question with ID "${questionId}" not found for this service`);
    }

    return this.formatQuestion(question);
  }

  /**
   * 3. Create a new question for a service
   */
  public static async createQuestion(
    serviceId: string,
    input: CreateQuestionInput,
    user?: AuthUserPayload
  ): Promise<QuestionResponse> {
    await this.verifyServiceAccess(serviceId, user);

    const existingQuestions = await this.getQuestionsForService(serviceId);
    const orderIndex =
      input.orderIndex !== undefined
        ? input.orderIndex
        : existingQuestions.length > 0
        ? Math.max(...existingQuestions.map((q) => q.orderIndex)) + 1
        : 1;

    const options = Array.isArray(input.options) ? input.options.map((o) => o.trim()).filter(Boolean) : [];
    if (input.questionType === 'select' && options.length === 0) {
      throw new BadRequestError('Selectable questions must specify at least one option.');
    }

    const newId = `qst_${crypto.randomUUID()}`;
    const now = new Date();

    const entity: QuestionEntity = {
      id: newId,
      service_id: serviceId,
      question_text: input.questionText.trim(),
      question_type: input.questionType || 'text',
      options,
      is_required: Boolean(input.isRequired),
      order_index: orderIndex,
      created_at: now,
      updated_at: now,
    };

    if (await this.isDbConnected()) {
      try {
        const res = await db.query<QuestionEntity>(
          `INSERT INTO questions (
            id, service_id, question_text, question_type, options, is_required, order_index, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            entity.id,
            entity.service_id,
            entity.question_text,
            entity.question_type,
            JSON.stringify(entity.options),
            entity.is_required,
            entity.order_index,
            entity.created_at,
            entity.updated_at,
          ]
        );
        if (res.rows.length > 0) {
          const formatted = this.formatQuestion(res.rows[0]);
          // Sync in-memory
          const list = inMemoryQuestions.get(serviceId) || [];
          list.push(res.rows[0]);
          list.sort((a, b) => a.order_index - b.order_index);
          inMemoryQuestions.set(serviceId, list);
          return formatted;
        }
      } catch (err: any) {
        logger.warn('Failed to insert question into DB, falling back to in-memory store', { error: err.message });
      }
    }

    // In-memory update
    const list = inMemoryQuestions.get(serviceId) || [];
    list.push(entity);
    list.sort((a, b) => a.order_index - b.order_index);
    inMemoryQuestions.set(serviceId, list);

    logger.info('Intake question created', {
      questionId: entity.id,
      serviceId,
      type: entity.question_type,
      isRequired: entity.is_required,
    });

    return this.formatQuestion(entity);
  }

  /**
   * 4. Update an existing question
   */
  public static async updateQuestion(
    serviceId: string,
    questionId: string,
    input: UpdateQuestionInput,
    user?: AuthUserPayload
  ): Promise<QuestionResponse> {
    await this.verifyServiceAccess(serviceId, user);

    // Verify question exists
    const current = await this.getQuestionById(serviceId, questionId);

    const questionType = input.questionType || current.questionType;
    let options = input.options !== undefined ? input.options.map((o) => o.trim()).filter(Boolean) : current.options;

    if (questionType === 'select' && options.length === 0) {
      throw new BadRequestError('Selectable questions must specify at least one option.');
    }
    if (questionType !== 'select' && input.options === undefined && current.questionType === 'select') {
      options = [];
    }

    const questionText = input.questionText !== undefined ? input.questionText.trim() : current.questionText;
    const isRequired = input.isRequired !== undefined ? input.isRequired : current.isRequired;
    const orderIndex = input.orderIndex !== undefined ? input.orderIndex : current.orderIndex;
    const updatedAt = new Date();

    if (await this.isDbConnected()) {
      try {
        const res = await db.query<QuestionEntity>(
          `UPDATE questions 
           SET question_text = $1, question_type = $2, options = $3, is_required = $4, order_index = $5, updated_at = $6
           WHERE id = $7 AND service_id = $8
           RETURNING *`,
          [
            questionText,
            questionType,
            JSON.stringify(options),
            isRequired,
            orderIndex,
            updatedAt,
            questionId,
            serviceId,
          ]
        );
        if (res.rows.length > 0) {
          const updated = res.rows[0];
          // Sync in-memory
          const list = inMemoryQuestions.get(serviceId) || [];
          const idx = list.findIndex((q) => q.id === questionId);
          if (idx !== -1) {
            list[idx] = updated;
            list.sort((a, b) => a.order_index - b.order_index);
          }
          return this.formatQuestion(updated);
        }
      } catch (err: any) {
        logger.warn('Failed to update question in DB, falling back to in-memory store', { error: err.message });
      }
    }

    // In-memory update
    const list = inMemoryQuestions.get(serviceId) || [];
    const idx = list.findIndex((q) => q.id === questionId);
    if (idx === -1) {
      throw new NotFoundError(`Question "${questionId}" not found in memory store`);
    }

    const updatedEntity: QuestionEntity = {
      ...list[idx],
      question_text: questionText,
      question_type: questionType,
      options,
      is_required: isRequired,
      order_index: orderIndex,
      updated_at: updatedAt,
    };

    list[idx] = updatedEntity;
    list.sort((a, b) => a.order_index - b.order_index);
    inMemoryQuestions.set(serviceId, list);

    logger.info('Intake question updated', { questionId, serviceId });
    return this.formatQuestion(updatedEntity);
  }

  /**
   * 5. Delete a question
   */
  public static async deleteQuestion(
    serviceId: string,
    questionId: string,
    user?: AuthUserPayload
  ): Promise<boolean> {
    await this.verifyServiceAccess(serviceId, user);

    // Verify existence
    await this.getQuestionById(serviceId, questionId);

    if (await this.isDbConnected()) {
      try {
        await db.query(`DELETE FROM questions WHERE id = $1 AND service_id = $2`, [questionId, serviceId]);
      } catch (err: any) {
        logger.warn('Failed to delete question from DB, deleting from in-memory store', { error: err.message });
      }
    }

    // In-memory update
    const list = inMemoryQuestions.get(serviceId) || [];
    inMemoryQuestions.set(
      serviceId,
      list.filter((q) => q.id !== questionId)
    );

    logger.info('Intake question deleted', { questionId, serviceId });
    return true;
  }

  /**
   * 6. Reorder questions for a service
   */
  public static async reorderQuestions(
    serviceId: string,
    input: ReorderQuestionsInput,
    user?: AuthUserPayload
  ): Promise<QuestionResponse[]> {
    await this.verifyServiceAccess(serviceId, user);

    const orderMap = new Map<string, number>();
    if (input.questionIds && input.questionIds.length > 0) {
      input.questionIds.forEach((id, index) => {
        orderMap.set(id, index + 1);
      });
    } else if (input.orders && input.orders.length > 0) {
      input.orders.forEach((item) => {
        orderMap.set(item.id, item.orderIndex);
      });
    }

    if (await this.isDbConnected()) {
      try {
        await db.transaction(async (client) => {
          for (const [id, orderIdx] of orderMap.entries()) {
            await client.query(
              `UPDATE questions SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND service_id = $3`,
              [orderIdx, id, serviceId]
            );
          }
        });
      } catch (err: any) {
        logger.warn('Failed to reorder questions in DB, falling back to in-memory store', { error: err.message });
      }
    }

    // In-memory update
    const list = inMemoryQuestions.get(serviceId) || [];
    for (const q of list) {
      if (orderMap.has(q.id)) {
        q.order_index = orderMap.get(q.id)!;
        q.updated_at = new Date();
      }
    }
    list.sort((a, b) => a.order_index - b.order_index);
    inMemoryQuestions.set(serviceId, list);

    logger.info('Intake questions reordered', { serviceId, reorderedCount: orderMap.size });
    return this.getQuestionsForService(serviceId);
  }
}
