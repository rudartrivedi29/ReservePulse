import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  useToast,
} from '../../components/ui';
import {
  resourceClient,
  type ResourceItem,
} from '../../services/resource.service';
import type { ServiceItem } from '../../services/service.service';

interface ResourceAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceItem | null;
  availableServices: ServiceItem[];
  onSuccess: (updatedResource: ResourceItem) => void;
}

export const ResourceAssignmentModal: React.FC<ResourceAssignmentModalProps> = ({
  isOpen,
  onClose,
  resource,
  availableServices,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (resource) {
      setSelectedServiceIds(resource.assignedServices?.map((s) => s.id) || []);
    } else {
      setSelectedServiceIds([]);
    }
  }, [resource, isOpen]);

  if (!resource) return null;

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedServiceIds(availableServices.map((s) => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedServiceIds([]);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await resourceClient.setAssignedServices(resource.id, selectedServiceIds);
      if (res.data) {
        // Fetch refreshed resource with assignments
        const refreshedRes = await resourceClient.getResourceById(resource.id);
        if (refreshedRes.data) {
          onSuccess(refreshedRes.data);
        }
        toast.success(
          'Assignments Saved',
          `Service assignments for "${resource.name}" updated successfully.`
        );
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save assignments';
      toast.error('Assignment Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Service Bindings: ${resource.name}`}
      description="Configure which offerings allocate and require this resource."
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-500 font-medium">
            {selectedServiceIds.length} of {availableServices.length} assigned
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSubmitting}
            >
              Save Bindings
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 font-sans text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-slate-600">Select services using this resource:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-emerald-700 hover:underline font-semibold cursor-pointer"
            >
              Select All
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-slate-500 hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {availableServices.length > 0 ? (
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {availableServices.map((service) => {
              const isChecked = selectedServiceIds.includes(service.id);
              return (
                <label
                  key={service.id}
                  className={`flex items-start justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleService(service.id)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">
                        {service.name}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {service.category} • {service.durationMinutes} mins • {service.capacityType}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
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
        ) : (
          <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl">
            No services found. Create services first to bind resources to them.
          </div>
        )}
      </div>
    </Modal>
  );
};
