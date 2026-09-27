import { Router } from 'express';
import { QuestionController } from '../controllers/question.controller';
import { validateBody } from '../validators';
import {
  createQuestionSchema,
  updateQuestionSchema,
  reorderQuestionsSchema,
} from '../validators/question.validator';

const router = Router({ mergeParams: true });

// 1. Get questions for service
router.get('/', QuestionController.getServiceQuestions);

// 2. Create question for service
router.post('/', validateBody(createQuestionSchema), QuestionController.createQuestion);

// 3. Reorder questions for service
router.put('/reorder', validateBody(reorderQuestionsSchema), QuestionController.reorderQuestions);

// 4. Update specific question
router.put('/:questionId', validateBody(updateQuestionSchema), QuestionController.updateQuestion);

// 5. Delete specific question
router.delete('/:questionId', QuestionController.deleteQuestion);

export const questionRoutes = router;
