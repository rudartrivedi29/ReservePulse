import { Request, Response, NextFunction } from 'express';
import { QuestionService } from '../services/question.service';
import { successResponse } from '../utils/apiResponse';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
  ReorderQuestionsInput,
} from '../validators/question.validator';

export class QuestionController {
  /**
   * GET /api/v1/services/:serviceId/questions
   * GET /api/v1/organiser/services/:serviceId/questions
   * Retrieve intake questions for a specific service
   */
  public static async getServiceQuestions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const serviceId = req.params.serviceId || req.params.id;
      const questions = await QuestionService.getQuestionsForService(serviceId);
      res.json(
        successResponse(
          questions,
          `Intake questions for service "${serviceId}" retrieved (${questions.length} questions)`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/organiser/services/:serviceId/questions
   * Organiser creates a new custom question for a service
   */
  public static async createQuestion(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const serviceId = req.params.serviceId || req.params.id;
      const input = req.body as CreateQuestionInput;
      const question = await QuestionService.createQuestion(serviceId, input, req.user);
      res.status(201).json(
        successResponse(question, 'Intake question created successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/organiser/services/:serviceId/questions/:questionId
   * Organiser updates an existing question (text, type, options, isRequired, orderIndex)
   */
  public static async updateQuestion(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const serviceId = req.params.serviceId || req.params.id;
      const questionId = req.params.questionId;
      const input = req.body as UpdateQuestionInput;
      const question = await QuestionService.updateQuestion(serviceId, questionId, input, req.user);
      res.json(
        successResponse(question, 'Intake question updated successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/organiser/services/:serviceId/questions/:questionId
   * Organiser deletes a question from a service
   */
  public static async deleteQuestion(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const serviceId = req.params.serviceId || req.params.id;
      const questionId = req.params.questionId;
      await QuestionService.deleteQuestion(serviceId, questionId, req.user);
      res.json(
        successResponse(
          { id: questionId, serviceId },
          'Intake question deleted successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/organiser/services/:serviceId/questions/reorder
   * Organiser reorders questions for a service
   */
  public static async reorderQuestions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const serviceId = req.params.serviceId || req.params.id;
      const input = req.body as ReorderQuestionsInput;
      const questions = await QuestionService.reorderQuestions(serviceId, input, req.user);
      res.json(
        successResponse(
          questions,
          `Questions reordered successfully (${questions.length} questions)`
        )
      );
    } catch (error) {
      next(error);
    }
  }
}
