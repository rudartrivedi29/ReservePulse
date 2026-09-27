export type ResourceType =
  | 'staff'
  | 'room'
  | 'compute'
  | 'equipment'
  | 'pod'
  | 'studio'
  | 'vehicle'
  | 'other';

export type ResourceStatus =
  | 'active'
  | 'inactive'
  | 'operational'
  | 'maintenance'
  | 'decommissioned';

export interface ResourceEntity {
  id: string;
  organiser_id: string;
  name: string;
  resource_type: ResourceType;
  description: string | null;
  location: string | null;
  capacity: number;
  status: ResourceStatus;
  metadata?: Record<string, unknown>;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ServiceResourceEntity {
  id: string;
  service_id: string;
  resource_id: string;
  is_required: boolean;
  allocation_quantity: number;
  created_at: Date | string;
}

export interface AssignedServiceSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  durationMinutes: number;
  isRequired: boolean;
  allocationQuantity: number;
}

export interface ResourceResponse {
  id: string;
  organiserId: string;
  name: string;
  resourceType: ResourceType;
  description: string;
  location: string;
  capacity: number;
  status: ResourceStatus;
  isActive: boolean;
  assignedServices?: AssignedServiceSummary[];
  createdAt: string;
  updatedAt: string;
}

export const formatResourceResponse = (
  entity: ResourceEntity,
  assignedServices: AssignedServiceSummary[] = []
): ResourceResponse => {
  const isActuallyActive =
    entity.status === 'active' || entity.status === 'operational';

  return {
    id: entity.id,
    organiserId: entity.organiser_id,
    name: entity.name,
    resourceType: entity.resource_type,
    description: entity.description || '',
    location: entity.location || '',
    capacity: Number(entity.capacity) || 1,
    status: entity.status,
    isActive: isActuallyActive,
    assignedServices,
    createdAt: new Date(entity.created_at).toISOString(),
    updatedAt: new Date(entity.updated_at).toISOString(),
  };
};
