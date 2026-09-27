export type QuestionType = 'text' | 'textarea' | 'select' | 'checkbox' | 'number';

export interface QuestionEntity {
  id: string;
  service_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[] | string;
  is_required: boolean;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

export interface QuestionResponse {
  id: string;
  serviceId: string;
  questionText: string;
  questionType: QuestionType;
  options: string[];
  isRequired: boolean;
  orderIndex: number;
}
