import { apiClient } from './api';
import type { ApiResponse } from '../types';

export type QuestionType = 'text' | 'textarea' | 'select' | 'checkbox' | 'number';

export interface ServiceQuestionItem {
  id: string;
  serviceId: string;
  questionText: string;
  questionType: QuestionType;
  options: string[];
  isRequired: boolean;
  orderIndex: number;
}

export interface CreateQuestionPayload {
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  isRequired?: boolean;
  orderIndex?: number;
}

export type UpdateQuestionPayload = Partial<CreateQuestionPayload>;

export interface ReorderQuestionsPayload {
  questionIds?: string[];
  orders?: Array<{ id: string; orderIndex: number }>;
}

export const questionClient = {
  /**
   * Fetch all questions for a service (public customer view or organiser)
   */
  async getQuestions(serviceId: string): Promise<ApiResponse<ServiceQuestionItem[]>> {
    return apiClient.get<ServiceQuestionItem[]>(`/services/${serviceId}/questions`);
  },

  /**
   * Organiser creates a new custom intake question
   */
  async createQuestion(
    serviceId: string,
    payload: CreateQuestionPayload
  ): Promise<ApiResponse<ServiceQuestionItem>> {
    return apiClient.post<ServiceQuestionItem>(`/organiser/services/${serviceId}/questions`, payload);
  },

  /**
   * Organiser updates an existing question
   */
  async updateQuestion(
    serviceId: string,
    questionId: string,
    payload: UpdateQuestionPayload
  ): Promise<ApiResponse<ServiceQuestionItem>> {
    return apiClient.put<ServiceQuestionItem>(
      `/organiser/services/${serviceId}/questions/${questionId}`,
      payload
    );
  },

  /**
   * Organiser deletes a question
   */
  async deleteQuestion(
    serviceId: string,
    questionId: string
  ): Promise<ApiResponse<{ id: string; serviceId: string }>> {
    return apiClient.delete<{ id: string; serviceId: string }>(
      `/organiser/services/${serviceId}/questions/${questionId}`
    );
  },

  /**
   * Organiser reorders questions for a service
   */
  async reorderQuestions(
    serviceId: string,
    payload: ReorderQuestionsPayload
  ): Promise<ApiResponse<ServiceQuestionItem[]>> {
    return apiClient.put<ServiceQuestionItem[]>(
      `/organiser/services/${serviceId}/questions/reorder`,
      payload
    );
  },
};
