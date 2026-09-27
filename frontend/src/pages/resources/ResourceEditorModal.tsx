import React, { useState, useEffect } from 'react';
import {
  Modal,
  Input,
  Select,
  Button,
  useToast,
} from '../../components/ui';
import {
  resourceClient,
  type ResourceItem,
  type ResourceType,
  type ResourceStatus,
  type CreateResourcePayload,
} from '../../services/resource.service';
import type { ServiceItem } from '../../services/service.service';

interface ResourceEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (resource: ResourceItem) => void;
  resourceToEdit?: ResourceItem | null;
  availableServices?: ServiceItem[];
}

export const ResourceEditorModal: React.FC<ResourceEditorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  resourceToEdit,
  availableServices = [],
}) => {
  const { toast } = useToast();
  const isEditing = Boolean(resourceToEdit);

  // Form states
  const [name, setName] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType>('room');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [status, setStatus] = useState<ResourceStatus>('active');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Validation & UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (resourceToEdit) {
      setName(resourceToEdit.name || '');
      setResourceType(resourceToEdit.resourceType || 'room');
      setDescription(resourceToEdit.description || '');
      setLocation(resourceToEdit.location || '');
      setCapacity(resourceToEdit.capacity || 1);
      setStatus(resourceToEdit.status || 'active');
      setSelectedServiceIds(
        resourceToEdit.assignedServices?.map((s) => s.id) || []
      );
    } else {
      setName('');
      setResourceType('room');
      setDescription('');
      setLocation('');
      setCapacity(1);
      setStatus('active');
      setSelectedServiceIds([]);
    }
    setErrors({});
    setServerError(null);
  }, [resourceToEdit, isOpen]);

  const toggleServiceAssignment = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Resource identifier / name is required';
    } else if (name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }

    if (!capacity || capacity < 1) {
      errs.capacity = 'Capacity must be at least 1';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload: CreateResourcePayload = {
        name: name.trim(),
        resourceType,
        description: description.trim(),
        location: location.trim(),
        capacity: Number(capacity),
        status,
        serviceIds: selectedServiceIds,
      };

      let result: ResourceItem;

      if (isEditing && resourceToEdit) {
        const res = await resourceClient.updateResource(resourceToEdit.id, payload);
        if (!res.data) throw new Error(res.message || 'Failed to update resource');
        result = res.data;
        toast.success(
          'Resource Updated',
          `"${result.name}" was updated successfully.`
        );
      } else {
        const res = await resourceClient.createResource(payload);
        if (!res.data) throw new Error(res.message || 'Failed to create resource');
        result = res.data;
        toast.success(
          'Resource Registered',
          `"${result.name}" has been added to your resource fleet.`
        );
      }

      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save resource';
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
      title={isEditing ? `Edit Resource: ${resourceToEdit?.name}` : 'Provision New Resource / Provider'}
      description="Register facilities, staff providers, compute nodes, and equipment assigned to appointments."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full font-sans">
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
              {isEditing ? 'Save Changes' : 'Register Resource'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans">
        {serverError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Error saving resource</p>
              <p>{serverError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Input
              label="Resource / Provider Name"
              placeholder="e.g. Executive Boardroom Alpha or Dr. Jordan Vance"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
          </div>

          <div>
            <Select
              label="Resource Type"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value as ResourceType)}
              options={[
                { value: 'staff', label: 'Staff / Personnel Provider' },
                { value: 'room', label: 'Room / Boardroom / Suite' },
                { value: 'pod', label: 'Pod / Quiet Consultation Booth' },
                { value: 'compute', label: 'Compute / GPU Server Cluster' },
                { value: 'studio', label: 'Studio / Recording Lab' },
                { value: 'equipment', label: 'Equipment / Hardware Tool' },
                { value: 'vehicle', label: 'Vehicle / Mobile Unit' },
                { value: 'other', label: 'Other / Specialized Asset' },
              ]}
              helperText="Determines allocation behavior and icon"
            />
          </div>

          <div>
            <Select
              label="Initial Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ResourceStatus)}
              options={[
                { value: 'active', label: 'Active (Available for appointments)' },
                { value: 'inactive', label: 'Inactive (Offline / Unavailable)' },
                { value: 'maintenance', label: 'Maintenance (Undergoing inspection)' },
              ]}
            />
          </div>

          <div>
            <Input
              label="Capacity / Seats"
              type="number"
              min="1"
              max="500"
              required
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)}
              error={errors.capacity}
              helperText="Simultaneous participants / throughput"
            />
          </div>

          <div>
            <Input
              label="Physical / Virtual Location"
              placeholder="e.g. Building A, Floor 4 or Ashburn Rack 12"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              helperText="Location shown on reservation tickets"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Description &amp; Specifications
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Equipment specifications, audio-visual capabilities, or provider specialties..."
            className="w-full bg-white text-slate-900 placeholder:text-slate-400 text-xs rounded-xl p-3 border border-slate-200 hover:border-emerald-300 focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/15 transition-all shadow-xs"
          />
        </div>

        {/* Assigned Services Section */}
        {availableServices.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-800">
                Assigned Bookable Services ({selectedServiceIds.length} selected)
              </label>
              <span className="text-[10px] text-slate-400">
                Check services that require this resource
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              {availableServices.map((service) => {
                const isSelected = selectedServiceIds.includes(service.id);
                return (
                  <label
                    key={service.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs border ${
                      isSelected
                        ? 'bg-white border-emerald-300 shadow-xs'
                        : 'bg-transparent border-transparent hover:bg-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleServiceAssignment(service.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          {service.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {service.category} • {service.durationMinutes} mins • {service.capacityType}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        service.isPublished
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {service.isPublished ? 'Live' : 'Draft'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
