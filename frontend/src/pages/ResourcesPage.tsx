import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
  Modal,
  EmptyState,
  SkeletonCard,
  useToast,
} from '../components/ui';
import {
  resourceClient,
  type ResourceItem,
  type ResourceType,
} from '../services/resource.service';
import {
  serviceClient,
  type ServiceItem,
} from '../services/service.service';
import { ResourceEditorModal, ResourceAssignmentModal } from './resources';
import { useAuth } from '../context/useAuth';

export const ResourcesPage: React.FC = () => {
  const { toast } = useToast();
  const { role } = useAuth();
  const navigate = useNavigate();
  const isOrganiserView = role === 'organiser' || role === 'admin';

  // State
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [assigningResource, setAssigningResource] = useState<ResourceItem | null>(null);
  const [deletingResource, setDeletingResource] = useState<ResourceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch resources and organiser services
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resResult, srvResult] = await Promise.all([
        resourceClient.getOrganiserResources(),
        serviceClient.getOrganiserServices(),
      ]);

      if (resResult.data) {
        setResources(resResult.data);
      }
      if (srvResult.data) {
        setServices(srvResult.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load fleet resources';
      toast.error('Connection Warning', message);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = resources.length;
    const active = resources.filter((r) => r.isActive).length;
    const inactive = total - active;
    const totalAssignments = resources.reduce(
      (acc, r) => acc + (r.assignedServices?.length || 0),
      0
    );
    return { total, active, inactive, totalAssignments };
  }, [resources]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      const matchesType =
        typeFilter === 'all' || res.resourceType.toLowerCase() === typeFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && res.isActive) ||
        (statusFilter === 'inactive' && !res.isActive);

      const q = searchTerm.toLowerCase();
      const matchesSearch =
        res.name.toLowerCase().includes(q) ||
        res.description.toLowerCase().includes(q) ||
        res.location.toLowerCase().includes(q);

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [resources, typeFilter, statusFilter, searchTerm]);

  // Type Icon helper
  const renderTypeIcon = (type: ResourceType) => {
    switch (type) {
      case 'staff':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'compute':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        );
      case 'pod':
      case 'room':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'studio':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'equipment':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
    }
  };

  // Actions
  const handleToggleStatus = async (resource: ResourceItem) => {
    try {
      if (resource.isActive) {
        const res = await resourceClient.deactivateResource(resource.id);
        if (res.data) {
          setResources((prev) =>
            prev.map((r) => (r.id === resource.id ? res.data! : r))
          );
          toast.info('Resource Deactivated', `"${resource.name}" set to inactive.`);
        }
      } else {
        const res = await resourceClient.activateResource(resource.id);
        if (res.data) {
          setResources((prev) =>
            prev.map((r) => (r.id === resource.id ? res.data! : r))
          );
          toast.success('Resource Activated', `"${resource.name}" is now operational.`);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update resource status';
      toast.error('Action Failed', message);
    }
  };

  const handleEditorSuccess = (saved: ResourceItem) => {
    setResources((prev) => {
      const exists = prev.some((r) => r.id === saved.id);
      if (exists) {
        return prev.map((r) => (r.id === saved.id ? saved : r));
      }
      return [saved, ...prev];
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingResource) return;
    setIsDeleting(true);
    try {
      await resourceClient.deleteResource(deletingResource.id);
      setResources((prev) => prev.filter((r) => r.id !== deletingResource.id));
      toast.success('Resource Removed', `"${deletingResource.name}" was removed from the fleet.`);
      setDeletingResource(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete resource';
      toast.error('Deletion Failed', message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Provider &amp; Resource Management
            </h2>
            <Badge variant="emerald" size="xs">
              Fleet Console
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Provision staff providers, meeting suites, compute clusters, and equipment assigned to appointments.
          </p>
        </div>

        {/* Add Resource Button */}
        {isOrganiserView && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingResource(null);
              setIsEditorOpen(true);
            }}
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Resource / Provider
          </Button>
        )}
      </div>

      {/* KPI Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card variant="outlined" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Fleet Assets</span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </Card>

        <Card variant="outlined" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700">Active / Operational</span>
            <p className="text-2xl font-black text-emerald-950 mt-0.5">{stats.active}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </Card>

        <Card variant="outlined" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Inactive / Offline</span>
            <p className="text-2xl font-black text-slate-700 mt-0.5">{stats.inactive}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        </Card>

        <Card variant="outlined" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-sky-700">Service Bindings</span>
            <p className="text-2xl font-black text-sky-950 mt-0.5">{stats.totalAssignments}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        </Card>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Search Input */}
        <div className="w-full md:w-80">
          <Input
            placeholder="Search by name, specs, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            clearable
            onClear={() => setSearchTerm('')}
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-white text-slate-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive ({stats.inactive})
            </button>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'All Types' },
              { id: 'staff', label: 'Staff' },
              { id: 'room', label: 'Rooms' },
              { id: 'compute', label: 'Compute' },
              { id: 'pod', label: 'Pods' },
              { id: 'studio', label: 'Studios' },
              { id: 'equipment', label: 'Equipment' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                className={`
                  px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap
                  ${
                    typeFilter === t.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }
                `.trim()}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resources Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} className="h-64" />
          ))}
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((res) => {
            const hasServices = (res.assignedServices?.length || 0) > 0;
            return (
              <Card
                key={res.id}
                variant="glass"
                className="flex flex-col justify-between hover:shadow-lg transition-all duration-200 border-slate-200/80"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                          {renderTypeIcon(res.resourceType)}
                          <span>{res.resourceType}</span>
                        </span>

                        <Badge
                          variant={
                            res.isActive
                              ? 'emerald'
                              : res.status === 'maintenance'
                              ? 'amber'
                              : 'slate'
                          }
                          size="xs"
                          dot
                          pulseDot={res.isActive}
                        >
                          {res.isActive ? 'Active' : res.status}
                        </Badge>
                      </div>

                      <CardTitle className="text-base font-bold text-slate-900 line-clamp-1">
                        {res.name}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {res.description || 'No detailed specifications provided for this resource.'}
                    </p>

                    {/* Location & Capacity tags */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100 text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-800">Capacity: </span>
                        {res.capacity} {res.capacity === 1 ? 'seat / unit' : 'seats / units'}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-slate-800">Location: </span>
                        <span title={res.location}>{res.location || 'Unspecified'}</span>
                      </div>
                    </div>

                    {/* Assigned services preview */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Assigned Services ({res.assignedServices?.length || 0})
                        </span>
                        <button
                          type="button"
                          onClick={() => setAssigningResource(res)}
                          className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                        >
                          Manage
                        </button>
                      </div>

                      {hasServices ? (
                        <div className="flex flex-wrap gap-1">
                          {res.assignedServices!.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium truncate max-w-[200px]"
                              title={s.name}
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          Not tied to any service yet.
                        </span>
                      )}
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* Activate/Deactivate Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(res)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                        res.isActive
                          ? 'text-slate-700 bg-slate-100 border-slate-200 hover:bg-slate-200'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {res.isActive ? 'Deactivate' : 'Activate'}
                    </button>

                    {/* Quick Assign Services Button */}
                    <button
                      type="button"
                      onClick={() => setAssigningResource(res)}
                      title="Assign bookable services"
                      className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>

                    {/* Quick Schedule Working Hours Button */}
                    <button
                      type="button"
                      onClick={() => navigate(`/${role === 'admin' ? 'admin' : 'organiser'}/calendar?resourceId=${res.id}`)}
                      title="Configure weekly working hours & shifts"
                      className="p-1 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => {
                        setEditingResource(res);
                        setIsEditorOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setDeletingResource(res)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          preset="no-results"
          variant="card"
          title="No Resources Found"
          description="Provision equipment, consultation pods, staff, or workspaces to allocate toward your appointment services."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingResource(null);
                setIsEditorOpen(true);
              }}
            >
              + Add Resource / Provider
            </Button>
          }
          secondaryAction={
            (typeFilter !== 'all' || statusFilter !== 'all' || searchTerm) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
              >
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Create / Edit Resource Modal */}
      <ResourceEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        resourceToEdit={editingResource}
        availableServices={services}
        onSuccess={handleEditorSuccess}
      />

      {/* Dedicated Service Assignment Modal */}
      <ResourceAssignmentModal
        isOpen={Boolean(assigningResource)}
        onClose={() => setAssigningResource(null)}
        resource={assigningResource}
        availableServices={services}
        onSuccess={(updated) => {
          setResources((prev) =>
            prev.map((r) => (r.id === updated.id ? updated : r))
          );
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingResource && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingResource(null)}
          title="Delete Fleet Resource"
          description={`Are you sure you want to remove "${deletingResource.name}" from your resource fleet?`}
          size="sm"
          footer={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingResource(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
                isLoading={isDeleting}
              >
                Confirm Delete
              </Button>
            </>
          }
        >
          <div className="text-xs text-slate-600">
            Deleting this resource will remove all its bindings to services. Any future appointment slots relying on it will need to be reallocated.
          </div>
        </Modal>
      )}
    </div>
  );
};
