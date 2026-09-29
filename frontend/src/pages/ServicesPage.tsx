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
  serviceClient,
  type ServiceItem,
} from '../services/service.service';
import { ServiceEditorModal } from './services/ServiceEditorModal';
import { ServiceQuestionsModal } from '../components/services';
import { BookingWizard } from '../components/booking';
import { useAuth } from '../context/useAuth';
import { HelpCircle } from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { role } = useAuth();

  // Determine if viewing as organiser/admin
  const isOrganiserView = role === 'organiser' || role === 'admin';

  // State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deletingService, setDeletingService] = useState<ServiceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [questionsService, setQuestionsService] = useState<ServiceItem | null>(null);

  // Customer reservation preview modal state
  const [customerModalService, setCustomerModalService] = useState<ServiceItem | null>(null);

  // Fetch services based on role
  const loadServices = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOrganiserView) {
        const res = await serviceClient.getOrganiserServices();
        if (res.data) {
          setServices(res.data);
        }
      } else {
        const res = await serviceClient.getPublicServices();
        if (res.data) {
          setServices(res.data);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load services';
      toast.error('Network Warning', message);
    } finally {
      setIsLoading(false);
    }
  }, [isOrganiserView, toast]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>(['All']);
    services.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats);
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        (service.category || '').toLowerCase() === selectedCategory.toLowerCase();
      
      const matchesSearch =
        (service.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const isPublished = Boolean(service.isPublished ?? service.isActive);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && isPublished) ||
        (statusFilter === 'draft' && !isPublished);

      return matchesCategory && matchesSearch && matchesStatus;
    });
  }, [services, selectedCategory, searchTerm, statusFilter]);

  // Metrics
  const stats = useMemo(() => {
    const total = services.length;
    const published = services.filter((s) => Boolean(s.isPublished ?? s.isActive)).length;
    const drafts = total - published;
    return { total, published, drafts };
  }, [services]);

  // Actions
  const handleOpenCreateModal = () => {
    setEditingService(null);
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setIsEditorOpen(true);
  };

  const handleEditorSuccess = (savedService: ServiceItem) => {
    setServices((prev) => {
      const exists = prev.some((s) => s.id === savedService.id);
      if (exists) {
        return prev.map((s) => (s.id === savedService.id ? savedService : s));
      }
      return [savedService, ...prev];
    });
  };

  const handleTogglePublish = async (service: ServiceItem) => {
    const isCurrentlyPublished = Boolean(service.isPublished ?? service.isActive);
    try {
      if (isCurrentlyPublished) {
        const res = await serviceClient.unpublishService(service.id);
        if (res.data) {
          setServices((prev) => prev.map((s) => (s.id === service.id ? res.data! : s)));
          toast.info('Service Unpublished', `"${service.name}" is now saved as a draft.`);
        }
      } else {
        const res = await serviceClient.publishService(service.id);
        if (res.data) {
          setServices((prev) => prev.map((s) => (s.id === service.id ? res.data! : s)));
          toast.success('Service Published!', `"${service.name}" is now active in the catalog.`);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update service status';
      toast.error('Action Failed', message);
    }
  };

  const handleCopyShareLink = (service: ServiceItem) => {
    const url = `${window.location.origin}/services/preview/${service.shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Preview Link Copied!', `Share link for "${service.name}" copied to clipboard.`);
  };

  const handlePreviewService = (service: ServiceItem) => {
    navigate(`/services/preview/${service.shareToken}`);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingService) return;
    setIsDeleting(true);
    try {
      await serviceClient.deleteService(deletingService.id);
      setServices((prev) => prev.filter((s) => s.id !== deletingService.id));
      toast.success('Service Deleted', `"${deletingService.name}" has been removed.`);
      setDeletingService(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete service';
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
              {isOrganiserView ? 'Service & Appointment Management' : 'Resource & Service Catalog'}
            </h2>
            {isOrganiserView && (
              <Badge variant="emerald" size="xs">
                Organiser Hub
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isOrganiserView
              ? 'Configure reservable appointment types, capacity limits, pricing, and secret preview links.'
              : 'Discover and reserve verified high-availability workspace and computational assets.'}
          </p>
        </div>

        {/* Top Right Action Button */}
        {isOrganiserView && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Create Service
            </Button>
          </div>
        )}
      </div>

      {/* Organiser Metrics KPI Bar */}
      {isOrganiserView && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="outlined" className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Total Services</span>
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
              <span className="text-xs font-semibold text-emerald-700">Published (Live)</span>
              <p className="text-2xl font-black text-emerald-950 mt-0.5">{stats.published}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </Card>

          <Card variant="outlined" className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-amber-700">Drafts (Unpublished)</span>
              <p className="text-2xl font-black text-amber-950 mt-0.5">{stats.drafts}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Search Input */}
        <div className="w-full md:w-80">
          <Input
            placeholder="Search by name, specs or description..."
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

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs for Organisers */}
          {isOrganiserView && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('published')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'published' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Published ({stats.published})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('draft')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'draft' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Drafts ({stats.drafts})
              </button>
            </div>
          )}

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`
                  px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap
                  ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }
                `.trim()}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Services List / Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} className="h-64" />
          ))}
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((service) => {
            const isPublished = Boolean(service.isPublished ?? service.isActive);
            return (
              <Card
                key={service.id}
                variant="glass"
                className="flex flex-col justify-between hover:shadow-lg transition-all duration-200 border-slate-200/80"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                          {service.category || 'General'}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge variant={isPublished ? 'emerald' : 'amber'} size="xs" dot>
                            {isPublished ? 'Published' : 'Draft'}
                          </Badge>
                          {service.requiresManualConfirmation && (
                            <Badge variant="blue" size="xs">
                              Manual
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 line-clamp-1">
                        {service.name}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>

                    {/* Spec tags */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100 text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-800">Duration: </span>
                        {service.durationMinutes} mins
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Capacity: </span>
                        {service.capacityType === 'individual'
                          ? '1-on-1'
                          : `${service.defaultCapacity} pax`}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Rate: </span>
                        {service.paymentSetting === 'free'
                          ? 'Free'
                          : `${service.priceCurrency} ${Number(service.priceAmount).toFixed(0)}`}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Resource: </span>
                        <span className="capitalize">{service.resourceAssignmentMode.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                  {isOrganiserView ? (
                    <>
                      {/* Organiser Action Buttons */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1">
                          {/* Publish/Unpublish toggle */}
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(service)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                              isPublished
                                ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {isPublished ? 'Unpublish' : 'Publish'}
                          </button>

                          {/* Copy Share Link */}
                          <button
                            type="button"
                            onClick={() => handleCopyShareLink(service)}
                            title="Copy secret preview share link"
                            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>

                          {/* Preview Screen */}
                          <button
                            type="button"
                            onClick={() => handlePreviewService(service)}
                            title="View preview screen"
                            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => setQuestionsService(service)}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 border-indigo-200"
                            title="Configure intake questions"
                          >
                            <HelpCircle className="w-3.5 h-3.5 mr-1" />
                            Questions
                          </Button>
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => handleOpenEditModal(service)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setDeletingService(service)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Customer / Public View */
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black text-slate-900">
                        {service.paymentSetting === 'free'
                          ? 'Free'
                          : `${service.priceCurrency} ${Number(service.priceAmount).toFixed(2)}`}
                      </span>
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => setCustomerModalService(service)}
                      >
                        Reserve Slot
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          preset="no-results"
          variant="card"
          title={
            isOrganiserView
              ? 'No Services Created Yet'
              : services.length === 0
              ? 'No Published Services Available'
              : 'No Matching Services'
          }
          description={
            isOrganiserView
              ? 'Get started by creating your first appointment or resource service.'
              : services.length === 0
              ? 'There are currently no active public services available in the catalog. Please refresh or check back soon.'
              : 'Try adjusting your search criteria or category filters to explore available services.'
          }
          action={
            isOrganiserView ? (
              <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
                + Create Service
              </Button>
            ) : services.length === 0 ? (
              <Button variant="primary" size="sm" onClick={loadServices}>
                Refresh Catalog
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                }}
              >
                Clear Filters
              </Button>
            )
          }
        />
      )}

      {/* Service Editor Modal (Create / Edit) */}
      <ServiceEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        serviceToEdit={editingService}
        onSuccess={handleEditorSuccess}
      />

      {/* Delete Confirmation Modal */}
      {deletingService && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingService(null)}
          title="Delete Service"
          description={`Are you sure you want to remove "${deletingService.name}"? This action cannot be undone.`}
          size="sm"
          footer={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingService(null)}
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
            Deleting this service will remove it from organiser dashboards and revoke its preview share links.
          </div>
        </Modal>
      )}

      {/* Customer Booking Flow Wizard */}
      {customerModalService && (
        <BookingWizard
          isOpen={Boolean(customerModalService)}
          onClose={() => setCustomerModalService(null)}
          preSelectedServiceId={customerModalService.id}
          onBookingSuccess={(booking) => {
            setCustomerModalService(null);
            toast.success(
              'Reservation Confirmed!',
              `Your appointment ${booking.bookingReference} has been verified and registered.`
            );
          }}
        />
      )}

      {/* Service Intake Questions Configuration Modal */}
      <ServiceQuestionsModal
        isOpen={Boolean(questionsService)}
        onClose={() => setQuestionsService(null)}
        service={questionsService}
        onQuestionsUpdated={loadServices}
      />
    </div>
  );
};
