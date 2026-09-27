import React, { useState, useEffect } from 'react';
import {
  Modal,
  Input,
  Select,
  Button,
  useToast,
} from '../../components/ui';
import {
  serviceClient,
  type ServiceItem,
  type CreateServicePayload,
  type AppointmentType,
  type PaymentSetting,
  type ResourceAssignmentMode,
} from '../../services/service.service';

interface ServiceEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (service: ServiceItem) => void;
  serviceToEdit?: ServiceItem | null;
}

export const ServiceEditorModal: React.FC<ServiceEditorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  serviceToEdit,
}) => {
  const { toast } = useToast();
  const isEditing = Boolean(serviceToEdit);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Consultation');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [capacityType, setCapacityType] = useState<AppointmentType>('individual');
  const [defaultCapacity, setDefaultCapacity] = useState(1);
  const [paymentSetting, setPaymentSetting] = useState<PaymentSetting>('free');
  const [priceAmount, setPriceAmount] = useState(0);
  const [priceCurrency, setPriceCurrency] = useState('USD');
  const [requiresManualConfirmation, setRequiresManualConfirmation] = useState(false);
  const [resourceAssignmentMode, setResourceAssignmentMode] = useState<ResourceAssignmentMode>('automatic');
  const [isPublished, setIsPublished] = useState(true);

  // UI & Validation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Populate or reset form whenever modal opens or serviceToEdit changes
  useEffect(() => {
    if (serviceToEdit) {
      setName(serviceToEdit.name || '');
      setDescription(serviceToEdit.description || '');
      setCategory(serviceToEdit.category || 'Consultation');
      setDurationMinutes(serviceToEdit.durationMinutes || 60);
      setCapacityType(serviceToEdit.capacityType || 'individual');
      setDefaultCapacity(serviceToEdit.defaultCapacity || 1);
      setPaymentSetting(serviceToEdit.paymentSetting || 'free');
      setPriceAmount(serviceToEdit.priceAmount || 0);
      setPriceCurrency(serviceToEdit.priceCurrency || 'USD');
      setRequiresManualConfirmation(Boolean(serviceToEdit.requiresManualConfirmation));
      setResourceAssignmentMode(serviceToEdit.resourceAssignmentMode || 'automatic');
      setIsPublished(Boolean(serviceToEdit.isPublished ?? serviceToEdit.isActive));
    } else {
      setName('');
      setDescription('');
      setCategory('Consultation');
      setDurationMinutes(60);
      setCapacityType('individual');
      setDefaultCapacity(1);
      setPaymentSetting('free');
      setPriceAmount(0);
      setPriceCurrency('USD');
      setRequiresManualConfirmation(false);
      setResourceAssignmentMode('automatic');
      setIsPublished(true);
    }
    setErrors({});
    setServerError(null);
  }, [serviceToEdit, isOpen]);

  // Adjust capacity when capacity type changes
  const handleCapacityTypeChange = (type: AppointmentType) => {
    setCapacityType(type);
    if (type === 'individual') {
      setDefaultCapacity(1);
    } else if (defaultCapacity <= 1) {
      setDefaultCapacity(5);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Service name is required';
    } else if (name.trim().length < 2) {
      errs.name = 'Service name must be at least 2 characters';
    }

    if (!description.trim()) {
      errs.description = 'Description is required';
    } else if (description.trim().length < 5) {
      errs.description = 'Description must be at least 5 characters';
    }

    if (!durationMinutes || durationMinutes <= 0) {
      errs.durationMinutes = 'Duration must be greater than 0';
    }

    if (capacityType !== 'individual' && (!defaultCapacity || defaultCapacity < 1)) {
      errs.defaultCapacity = 'Capacity must be at least 1 person';
    }

    if ((paymentSetting === 'paid' || paymentSetting === 'pay_in_person') && priceAmount < 0) {
      errs.priceAmount = 'Price cannot be negative';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateServicePayload = {
        name: name.trim(),
        description: description.trim(),
        category,
        durationMinutes: Number(durationMinutes),
        capacityType,
        defaultCapacity: capacityType === 'individual' ? 1 : Number(defaultCapacity),
        paymentSetting,
        priceAmount: paymentSetting === 'free' ? 0 : Number(priceAmount),
        priceCurrency,
        requiresManualConfirmation,
        resourceAssignmentMode,
        isPublished,
      };

      let resultService: ServiceItem;

      if (isEditing && serviceToEdit) {
        const res = await serviceClient.updateService(serviceToEdit.id, payload);
        if (!res.data) {
          throw new Error(res.message || 'Failed to update service');
        }
        resultService = res.data;
        toast.success(
          'Service Updated',
          `"${resultService.name}" has been successfully updated.`
        );
      } else {
        const res = await serviceClient.createService(payload);
        if (!res.data) {
          throw new Error(res.message || 'Failed to create service');
        }
        resultService = res.data;
        toast.success(
          isPublished ? 'Service Published!' : 'Draft Saved!',
          `"${resultService.name}" has been successfully created.`
        );
      }

      onSuccess(resultService);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while saving the service.';
      setServerError(message);
      toast.error('Operation Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Service: ${serviceToEdit?.name}` : 'Create New Service'}
      description="Configure appointment details, resource assignment, capacity, and pricing policies."
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 font-medium">
            * Required fields
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              {isEditing ? 'Save Changes' : isPublished ? 'Create & Publish' : 'Save as Draft'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Unable to save service</p>
              <p>{serverError}</p>
            </div>
          </div>
        )}

        {/* Section 1: Basic Information */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Basic Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Input
                label="Service Name"
                placeholder="e.g. Executive Strategy Consultation"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />
            </div>
            <div>
              <Select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'Consultation', label: 'Consultation' },
                  { value: 'Workspace', label: 'Workspace' },
                  { value: 'Compute', label: 'Compute & Cloud' },
                  { value: 'Hardware', label: 'Hardware & Studio' },
                  { value: 'Health & Wellness', label: 'Health & Wellness' },
                  { value: 'Legal & Financial', label: 'Legal & Financial' },
                  { value: 'Other', label: 'General / Other' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Service Description <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline what this service includes, requirements, and client expectations..."
              className={`
                w-full bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl p-3
                border transition-all duration-200 focus:outline-none shadow-xs
                ${
                  errors.description
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15'
                    : 'border-slate-200 hover:border-emerald-300 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15'
                }
              `.trim()}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.description}</p>
            )}
          </div>
        </div>

        {/* Section 2: Capacity & Appointment Type */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Scheduling &amp; Capacity
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Select
                label="Appointment Type"
                value={capacityType}
                onChange={(e) => handleCapacityTypeChange(e.target.value as AppointmentType)}
                options={[
                  { value: 'individual', label: '1-on-1 (Individual)' },
                  { value: 'group', label: 'Group Session' },
                  { value: 'resource_constrained', label: 'Resource Constrained' },
                ]}
                helperText="Determines attendee limit structure"
              />
            </div>

            <div>
              <Select
                label="Session Duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                options={[
                  { value: 15, label: '15 minutes' },
                  { value: 30, label: '30 minutes' },
                  { value: 45, label: '45 minutes' },
                  { value: 60, label: '60 minutes (1 hr)' },
                  { value: 90, label: '90 minutes (1.5 hrs)' },
                  { value: 120, label: '120 minutes (2 hrs)' },
                  { value: 180, label: '180 minutes (3 hrs)' },
                  { value: 240, label: '240 minutes (4 hrs)' },
                ]}
              />
            </div>

            <div>
              <Input
                label="Attendee Capacity"
                type="number"
                min="1"
                max="500"
                value={defaultCapacity}
                disabled={capacityType === 'individual'}
                onChange={(e) => setDefaultCapacity(Number(e.target.value))}
                error={errors.defaultCapacity}
                helperText={capacityType === 'individual' ? 'Fixed at 1 for 1-on-1 sessions' : 'Max simultaneous participants'}
              />
            </div>
          </div>

          <div>
            <Select
              label="Resource Assignment Mode"
              value={resourceAssignmentMode}
              onChange={(e) => setResourceAssignmentMode(e.target.value as ResourceAssignmentMode)}
              options={[
                { value: 'automatic', label: 'Automatic (Smart round-robin resource allocation)' },
                { value: 'any_available', label: 'Any Available (First available matching resource/staff)' },
                { value: 'single_resource', label: 'Single Dedicated Resource (Tied to a primary resource)' },
                { value: 'manual', label: 'Manual (Organiser selects resource per booking)' },
              ]}
              helperText="How facilities, rooms, equipment, or staff are assigned to bookings"
            />
          </div>
        </div>

        {/* Section 3: Pricing & Confirmation */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Payment &amp; Confirmation Policy
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Select
                label="Payment Setting"
                value={paymentSetting}
                onChange={(e) => setPaymentSetting(e.target.value as PaymentSetting)}
                options={[
                  { value: 'free', label: 'Free (Complimentary)' },
                  { value: 'paid', label: 'Paid Online (Upfront)' },
                  { value: 'pay_in_person', label: 'Pay in Person (On Arrival)' },
                ]}
              />
            </div>

            <div>
              <Input
                label="Price Amount"
                type="number"
                min="0"
                step="0.01"
                disabled={paymentSetting === 'free'}
                value={paymentSetting === 'free' ? 0 : priceAmount}
                onChange={(e) => setPriceAmount(parseFloat(e.target.value) || 0)}
                error={errors.priceAmount}
                helperText={paymentSetting === 'free' ? 'No fee charged' : 'Amount in selected currency'}
              />
            </div>

            <div>
              <Select
                label="Currency"
                value={priceCurrency}
                disabled={paymentSetting === 'free'}
                onChange={(e) => setPriceCurrency(e.target.value)}
                options={[
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'GBP', label: 'GBP (£)' },
                  { value: 'INR', label: 'INR (₹)' },
                  { value: 'AUD', label: 'AUD ($)' },
                  { value: 'CAD', label: 'CAD ($)' },
                ]}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            {/* Manual confirmation checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requiresManualConfirmation}
                onChange={(e) => setRequiresManualConfirmation(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Require Organiser Confirmation</span>
                <span className="text-slate-500">
                  Bookings will remain in pending state until you manually review and confirm them.
                </span>
              </div>
            </label>

            {/* Published / Draft toggle */}
            <label className="flex items-start gap-3 cursor-pointer select-none pt-2 border-t border-slate-200">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">
                  {isPublished ? 'Published (Listed in public catalog)' : 'Save as Draft (Unpublished)'}
                </span>
                <span className="text-slate-500">
                  {isPublished
                    ? 'Customers can discover this service once slots are published.'
                    : 'Draft services are hidden from public listings. You can preview them via secret share links.'}
                </span>
              </div>
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
};
