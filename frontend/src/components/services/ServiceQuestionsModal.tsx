import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Button,
  Input,
  Select,
  Badge,
  Spinner,
  EmptyState,
  useToast,
} from '../ui';
import {
  questionClient,
  type ServiceQuestionItem,
  type QuestionType,
} from '../../services/question.service';
import type { ServiceItem } from '../../services/service.service';
import {
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Eye,
  ListOrdered,
  X,
  Sparkles,
} from 'lucide-react';

export interface ServiceQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
  onQuestionsUpdated?: () => void;
}

export const ServiceQuestionsModal: React.FC<ServiceQuestionsModalProps> = ({
  isOpen,
  onClose,
  service,
  onQuestionsUpdated,
}) => {
  const { toast } = useToast();

  const [questions, setQuestions] = useState<ServiceQuestionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Form mode: 'none' | 'create' | 'edit'
  const [formMode, setFormMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Form fields
  const [questionText, setQuestionText] = useState<string>('');
  const [questionType, setQuestionType] = useState<QuestionType>('text');
  const [isRequired, setIsRequired] = useState<boolean>(false);
  const [options, setOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Load questions for the active service
  const loadQuestions = useCallback(async () => {
    if (!service) return;
    setIsLoading(true);
    try {
      const res = await questionClient.getQuestions(service.id);
      if (res.data) {
        setQuestions(res.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve questions';
      toast.error('Load Error', message);
    } finally {
      setIsLoading(false);
    }
  }, [service, toast]);

  useEffect(() => {
    if (isOpen && service) {
      loadQuestions();
      setFormMode('none');
      setEditingQuestionId(null);
      setFormError(null);
    }
  }, [isOpen, service, loadQuestions]);

  const handleStartCreate = () => {
    setFormMode('create');
    setEditingQuestionId(null);
    setQuestionText('');
    setQuestionType('text');
    setIsRequired(false);
    setOptions([]);
    setNewOptionInput('');
    setFormError(null);
  };

  const handleStartEdit = (q: ServiceQuestionItem) => {
    setFormMode('edit');
    setEditingQuestionId(q.id);
    setQuestionText(q.questionText);
    setQuestionType(q.questionType);
    setIsRequired(q.isRequired);
    setOptions(Array.isArray(q.options) ? [...q.options] : []);
    setNewOptionInput('');
    setFormError(null);
  };

  const handleCancelForm = () => {
    setFormMode('none');
    setEditingQuestionId(null);
    setFormError(null);
  };

  const handleAddOption = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;
    if (options.includes(trimmed)) {
      setFormError(`Option "${trimmed}" already exists.`);
      return;
    }
    setOptions([...options, trimmed]);
    setNewOptionInput('');
    setFormError(null);
  };

  const handleRemoveOption = (indexToRemove: number) => {
    setOptions(options.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;

    if (!questionText.trim()) {
      setFormError('Question prompt cannot be empty.');
      return;
    }

    if (questionType === 'select' && options.length === 0) {
      setFormError('Dropdown Selection questions must have at least one choice option.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (formMode === 'create') {
        const res = await questionClient.createQuestion(service.id, {
          questionText: questionText.trim(),
          questionType,
          options: questionType === 'select' ? options : [],
          isRequired,
        });

        if (res.data) {
          toast.success('Question Created', 'New intake question saved successfully.');
          await loadQuestions();
          setFormMode('none');
          if (onQuestionsUpdated) onQuestionsUpdated();
        }
      } else if (formMode === 'edit' && editingQuestionId) {
        const res = await questionClient.updateQuestion(service.id, editingQuestionId, {
          questionText: questionText.trim(),
          questionType,
          options: questionType === 'select' ? options : [],
          isRequired,
        });

        if (res.data) {
          toast.success('Question Updated', 'Intake question changes saved.');
          await loadQuestions();
          setFormMode('none');
          setEditingQuestionId(null);
          if (onQuestionsUpdated) onQuestionsUpdated();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save question';
      setFormError(message);
      toast.error('Save Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!service) return;
    if (!window.confirm('Are you sure you want to remove this intake question?')) return;

    try {
      await questionClient.deleteQuestion(service.id, questionId);
      toast.success('Question Removed', 'The question has been deleted.');
      await loadQuestions();
      if (formMode === 'edit' && editingQuestionId === questionId) {
        setFormMode('none');
      }
      if (onQuestionsUpdated) onQuestionsUpdated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete question';
      toast.error('Delete Error', message);
    }
  };

  const handleToggleRequired = async (q: ServiceQuestionItem) => {
    if (!service) return;
    try {
      await questionClient.updateQuestion(service.id, q.id, {
        isRequired: !q.isRequired,
      });
      toast.success(
        'Requirement Updated',
        `Question marked as ${!q.isRequired ? 'Mandatory' : 'Optional'}.`
      );
      await loadQuestions();
      if (onQuestionsUpdated) onQuestionsUpdated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update requirement';
      toast.error('Update Error', message);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (!service) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistic UI update
    setQuestions(reordered);

    const questionIds = reordered.map((q) => q.id);
    try {
      await questionClient.reorderQuestions(service.id, { questionIds });
      toast.success('Order Saved', 'Questions reordered successfully.');
      if (onQuestionsUpdated) onQuestionsUpdated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save order';
      toast.error('Reorder Error', message);
      await loadQuestions();
    }
  };

  if (!service) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
      className="p-0 overflow-hidden font-sans"
    >
      <div className="flex flex-col h-full max-h-[88vh]">
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Service Intake Form Configuration</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                {service.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="blue" className="bg-white/10 text-indigo-200 border-white/10">
                {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
              </Badge>
              <Badge variant="emerald" className="bg-white/10 text-emerald-200 border-white/10">
                {service.category}
              </Badge>
            </div>
          </div>

          {/* Subheader Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Questions & Form Builder</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Customer Checkout Preview</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/70">
          {activeTab === 'editor' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Action Toolbar */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Custom Intake Questions</h3>
                  <p className="text-xs text-slate-500">
                    Customers will be prompted to complete these questions prior to checkout confirmation.
                  </p>
                </div>
                {formMode === 'none' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleStartCreate}
                    className="shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Question
                  </Button>
                )}
              </div>

              {/* Question Editor Drawer / Box */}
              {formMode !== 'none' && (
                <div className="p-5 rounded-2xl bg-white border-2 border-indigo-500/30 shadow-md space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{formMode === 'create' ? 'Create New Intake Question' : 'Edit Question Details'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveQuestion} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">
                        Question Prompt / Label <span className="text-rose-600">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Session Purpose, Target CUDA version, Dietary specifications..."
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800">Answer Format</label>
                        <Select
                          value={questionType}
                          onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                          options={[
                            { value: 'text', label: 'Single-line Text (Input)' },
                            { value: 'textarea', label: 'Multi-line Paragraph (Textarea)' },
                            { value: 'select', label: 'Dropdown Selection (Selectable choices)' },
                            { value: 'number', label: 'Numerical Value (Integer / Quantity)' },
                          ]}
                        />
                      </div>

                      <div className="space-y-1 flex flex-col justify-end">
                        <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={isRequired}
                            onChange={(e) => setIsRequired(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              Required Question
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              Customer must answer before finalizing reservation
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Options builder for 'select' type */}
                    {questionType === 'select' && (
                      <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-indigo-950">
                            Selectable Answer Options <span className="text-rose-600">*</span>
                          </label>
                          <span className="text-[11px] text-indigo-700">
                            {options.length} {options.length === 1 ? 'choice added' : 'choices added'}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a choice (e.g. Dual 4K Presentation Mode)..."
                            value={newOptionInput}
                            onChange={(e) => setNewOptionInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddOption();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleAddOption}
                            disabled={!newOptionInput.trim()}
                          >
                            Add
                          </Button>
                        </div>

                        {options.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {options.map((opt, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-xs font-medium text-slate-800 shadow-2xs"
                              >
                                <span>{opt}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(idx)}
                                  className="text-slate-400 hover:text-rose-600"
                                  title="Remove option"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-700 italic">
                            At least one selectable choice is required.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelForm}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSaving}
                        disabled={isSaving}
                      >
                        {formMode === 'create' ? 'Create Question' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Questions List */}
              {isLoading ? (
                <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <Spinner size="md" className="mx-auto text-indigo-600 mb-2" />
                  <span className="text-xs text-slate-500">Loading service questions...</span>
                </div>
              ) : questions.length === 0 ? (
                <EmptyState
                  preset="custom"
                  title="No Intake Questions Defined"
                  description="This service currently has no intake questions. Customers can book without providing additional custom details."
                  action={
                    formMode === 'none' ? (
                      <Button variant="primary" size="sm" onClick={handleStartCreate}>
                        + Add First Question
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === questions.length - 1;

                    return (
                      <div
                        key={q.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        {/* Question info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Order control pill */}
                          <div className="flex flex-col items-center justify-center shrink-0">
                            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mb-1">
                              #{idx + 1}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => handleMoveOrder(idx, 'up')}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 disabled:opacity-20 hover:bg-slate-100"
                                title="Move question up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => handleMoveOrder(idx, 'down')}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 disabled:opacity-20 hover:bg-slate-100"
                                title="Move question down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {q.questionText}
                              </h4>
                              {q.isRequired ? (
                                <Badge variant="rose" className="text-[10px]">
                                  Required *
                                </Badge>
                              ) : (
                                <Badge variant="slate" className="text-[10px]">
                                  Optional
                                </Badge>
                              )}
                              <Badge variant="blue" className="text-[10px] capitalize">
                                {q.questionType}
                              </Badge>
                            </div>

                            {/* Select options preview */}
                            {q.questionType === 'select' && Array.isArray(q.options) && q.options.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-[11px] font-semibold text-slate-400">Options:</span>
                                {q.options.map((opt, oIdx) => (
                                  <span
                                    key={oIdx}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] text-slate-700 font-medium"
                                  >
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleToggleRequired(q)}
                            className="text-slate-600 hover:text-slate-900"
                            title="Toggle required / optional"
                          >
                            {q.isRequired ? 'Make Optional' : 'Make Required'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => handleStartEdit(q)}
                            className="text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100"
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Customer Preview Tab */}
          {activeTab === 'preview' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-950">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Live Customer Checkout Preview: </span>
                  <span>
                    This is how your intake form appears to customers in Step 6 of the reservation wizard.
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Service Intake Details</h3>
                    <p className="text-xs text-slate-500">Booking: {service.name}</p>
                  </div>
                  <Badge variant="blue">{service.category}</Badge>
                </div>

                {questions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 italic">
                    No intake questions configured. Customers will proceed directly to confirmation.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q) => (
                      <div key={q.id} className="space-y-1.5 text-xs">
                        <label className="font-semibold text-slate-800 flex items-center gap-1">
                          <span>{q.questionText}</span>
                          {q.isRequired && <span className="text-rose-600 font-bold">*</span>}
                        </label>

                        {q.questionType === 'select' ? (
                          <Select
                            options={[
                              { value: '', label: '-- Select an option --' },
                              ...q.options.map((opt) => ({ value: opt, label: opt })),
                            ]}
                          />
                        ) : q.questionType === 'textarea' ? (
                          <textarea
                            rows={3}
                            placeholder="Enter detailed response..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                          />
                        ) : q.questionType === 'number' ? (
                          <Input type="number" placeholder="e.g. 100" />
                        ) : (
                          <Input placeholder="Enter your response..." />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Changes are saved directly to the service catalog.
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
