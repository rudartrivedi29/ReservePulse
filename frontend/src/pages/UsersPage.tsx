import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminService, type AdminUserItem, type ListUsersParams } from '../services/admin.service';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  EmptyState,
  Spinner,
  Skeleton,
  SkeletonAvatar,
  useToast,
} from '../components/ui';

export const UsersPage: React.FC = () => {
  const { user: currentAuthUser } = useAuth();
  const { toast } = useToast();

  // State
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'ORGANISER' | 'CUSTOMER' | 'ADMIN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');

  // Modals state
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionName, setProvisionName] = useState('');
  const [provisionRole, setProvisionRole] = useState<'CUSTOMER' | 'ORGANISER' | 'ADMIN'>('CUSTOMER');
  const [provisionPhone, setProvisionPhone] = useState('');
  const [provisionPassword, setProvisionPassword] = useState('');
  const [isSubmittingProvision, setIsSubmittingProvision] = useState(false);

  // Role Management Modal
  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'ORGANISER' | 'ADMIN'>('CUSTOMER');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Status Toggle Modal
  const [statusModalUser, setStatusModalUser] = useState<AdminUserItem | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // User Inspect Modal
  const [inspectUser, setInspectUser] = useState<(AdminUserItem & { services?: any[]; resources?: any[]; recentBookings?: any[] }) | null>(null);
  const [isLoadingInspect, setIsLoadingInspect] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users
  const loadUsers = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const params: ListUsersParams = {
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        role: activeTab === 'ALL' ? undefined : activeTab,
        status: statusFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = await adminService.getUsers(params);
      setUsers(result.users);
      setTotalCount(result.total);
    } catch (err: any) {
      const msg = err?.message || 'Failed to retrieve platform users';
      setError(msg);
      if (!options?.silent) {
        toast.error('Query Failed', msg);
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [page, limit, debouncedSearch, activeTab, statusFilter, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Metrics breakdown calculated from loaded list or defaults
  const providerCount = users.filter((u) => u.role === 'ORGANISER').length;
  const customerCount = users.filter((u) => u.role === 'CUSTOMER').length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const deactivatedCount = users.filter((u) => !u.isActive).length;

  // Handle User Provisioning
  const handleProvisionUser = async () => {
    if (!provisionEmail.trim() || !provisionName.trim()) {
      toast.warning('Required Fields', 'Please specify user name and a valid email address.');
      return;
    }

    setIsSubmittingProvision(true);
    try {
      const newUser = await adminService.createUser({
        email: provisionEmail.trim(),
        fullName: provisionName.trim(),
        role: provisionRole,
        phone: provisionPhone.trim() || undefined,
        password: provisionPassword.trim() || undefined,
        isActive: true,
      });

      toast.success('Account Provisioned', `User ${newUser.email} successfully created.`);
      setIsProvisionOpen(false);
      setProvisionEmail('');
      setProvisionName('');
      setProvisionPhone('');
      setProvisionPassword('');
      loadUsers();
    } catch (err: any) {
      toast.error('Provisioning Failed', err?.message || 'Unable to create user');
    } finally {
      setIsSubmittingProvision(false);
    }
  };

  // Handle Role Change
  const handleConfirmRoleChange = async () => {
    if (!roleModalUser) return;
    setIsUpdatingRole(true);
    try {
      await adminService.updateUserRole(roleModalUser.id, selectedRole);
      toast.success('Role Updated', `${roleModalUser.fullName} is now assigned ${selectedRole} privileges.`);
      setRoleModalUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error('Role Update Failed', err?.message || 'Unable to update role privileges');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Handle Status Toggle (Activate/Deactivate)
  const handleConfirmStatusToggle = async () => {
    if (!statusModalUser) return;
    const targetStatus = !statusModalUser.isActive;
    setIsUpdatingStatus(true);
    try {
      await adminService.updateUserStatus(statusModalUser.id, targetStatus, statusReason);
      toast.success(
        targetStatus ? 'Account Activated' : 'Account Deactivated',
        `${statusModalUser.fullName}'s access has been ${targetStatus ? 'restored' : 'deactivated'}.`
      );
      setStatusModalUser(null);
      setStatusReason('');
      loadUsers();
    } catch (err: any) {
      toast.error('Action Blocked', err?.message || 'Unable to modify account access');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Inspect User Details
  const handleInspectUser = async (u: AdminUserItem) => {
    setIsLoadingInspect(true);
    setInspectUser({ ...u });
    try {
      const details = await adminService.getUserDetails(u.id);
      setInspectUser(details);
    } catch {
      // Keep basic info if detail lookup fails
    } finally {
      setIsLoadingInspect(false);
    }
  };

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            <span>Admin Governance Console</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            User Directory &amp; Provider Governance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit platform users, manage service providers, configure roles safely, and toggle account access.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadUsers()}
            title="Refresh directory"
          >
            <svg className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsProvisionOpen(true)}
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            }
          >
            Provision Account
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card variant="glass" className="py-2.5 px-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Users</span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">{totalCount}</div>
        </Card>

        <Card variant="glass" className="py-2.5 px-3">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">Providers (Organisers)</span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">{providerCount}</div>
        </Card>

        <Card variant="glass" className="py-2.5 px-3">
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">Customers</span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">{customerCount}</div>
        </Card>

        <Card variant="glass" className="py-2.5 px-3">
          <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block">Administrators</span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">{adminCount}</div>
        </Card>

        <Card variant="glass" className="py-2.5 px-3 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">Deactivated Accounts</span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">{deactivatedCount}</div>
        </Card>
      </div>

      {/* Role Navigation Tabs & Filters Toolbar */}
      <Card variant="glass">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'ALL', label: 'All Accounts' },
                { id: 'ORGANISER', label: 'Service Providers' },
                { id: 'CUSTOMER', label: 'Customers' },
                { id: 'ADMIN', label: 'Administrators' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setPage(1);
                }}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="deactivated">Deactivated Only</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Banner */}
      {error && (
        <Card variant="glass" className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-4 flex items-center justify-between gap-3 text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <span className="font-bold">Error loading users:</span>
              <span>{error}</span>
            </div>
            <Button size="xs" variant="secondary" onClick={() => loadUsers()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card variant="glass">
        <CardContent className="p-0">
          {isLoading && users.length === 0 ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <SkeletonAvatar size="sm" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-2.5 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-3.5 w-24 hidden sm:block" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3.5 w-24 hidden md:block" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-16 rounded-lg" />
                    <Skeleton className="h-7 w-16 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <EmptyState
                title="No accounts match your query"
                description={
                  searchTerm || statusFilter !== 'all' || activeTab !== 'ALL'
                    ? 'Try relaxing your search terms or filters.'
                    : 'No users registered on the platform yet.'
                }
                action={
                  searchTerm || statusFilter !== 'all' || activeTab !== 'ALL' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setActiveTab('ALL');
                      }}
                    >
                      Clear All Filters
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table density="normal" striped hoverable>
                <TableHeader>
                  <TableRow>
                    <TableHead>User / Account</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Catalog / Metrics</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="text-right">Administration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isSelf = currentAuthUser?.id === u.id || currentAuthUser?.email === u.email;

                    return (
                      <TableRow key={u.id}>
                        {/* User column */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-100 border border-slate-200 text-slate-800 font-extrabold flex items-center justify-center text-xs uppercase shrink-0 shadow-2xs">
                              {u.fullName ? u.fullName.slice(0, 2) : 'US'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900 truncate">{u.fullName}</p>
                                {isSelf && (
                                  <Badge variant="purple" size="xs">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                              {u.phone && <p className="text-[10px] text-slate-400">{u.phone}</p>}
                            </div>
                          </div>
                        </TableCell>

                        {/* Assigned Role */}
                        <TableCell>
                          <Badge
                            variant={
                              u.role === 'ADMIN' ? 'purple' : u.role === 'ORGANISER' ? 'emerald' : 'blue'
                            }
                            size="xs"
                            dot
                          >
                            {u.role}
                          </Badge>
                        </TableCell>

                        {/* Role-specific Metrics */}
                        <TableCell className="text-xs text-slate-600">
                          {u.role === 'ORGANISER' ? (
                            <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {u.servicesCount ?? 0} Services • {u.resourcesCount ?? 0} Resources
                            </span>
                          ) : u.role === 'CUSTOMER' ? (
                            <span className="font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {u.bookingsCount ?? 0} Bookings
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">System Superuser</span>
                          )}
                        </TableCell>

                        {/* Access Status */}
                        <TableCell>
                          <Badge
                            variant={u.isActive ? 'emerald' : 'rose'}
                            size="xs"
                            dot
                          >
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </Badge>
                        </TableCell>

                        {/* Joined Date */}
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(u.createdAt)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Inspect Details */}
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleInspectUser(u)}
                              title="Inspect user profile & catalog"
                            >
                              Inspect
                            </Button>

                            {/* Change Role Button */}
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                setRoleModalUser(u);
                                setSelectedRole(u.role);
                              }}
                            >
                              Role
                            </Button>

                            {/* Activate / Deactivate Toggle */}
                            <Button
                              size="xs"
                              variant={u.isActive ? 'ghost' : 'secondary'}
                              className={
                                u.isActive
                                  ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              }
                              disabled={isSelf && u.isActive}
                              title={
                                isSelf && u.isActive
                                  ? 'Safety rule: You cannot deactivate your own admin session'
                                  : u.isActive
                                  ? 'Deactivate account access'
                                  : 'Restore active account access'
                              }
                              onClick={() => {
                                setStatusModalUser(u);
                                setStatusReason('');
                              }}
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: Role Management with Safe Validation */}
      {/* ------------------------------------------------------------- */}
      {roleModalUser && (
        <Modal
          isOpen={true}
          onClose={() => setRoleModalUser(null)}
          title={`Configure Role: ${roleModalUser.fullName}`}
          description={`Update platform authority and access permissions for ${roleModalUser.email}.`}
          footer={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRoleModalUser(null)}
                disabled={isUpdatingRole}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRoleChange}
                disabled={isUpdatingRole || selectedRole === roleModalUser.role}
              >
                {isUpdatingRole ? 'Updating Role...' : 'Save Role Assignment'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Role:</span>
                <Badge
                  variant={
                    roleModalUser.role === 'ADMIN'
                      ? 'purple'
                      : roleModalUser.role === 'ORGANISER'
                      ? 'emerald'
                      : 'blue'
                  }
                  size="xs"
                >
                  {roleModalUser.role}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account Status:</span>
                <span className={roleModalUser.isActive ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                  {roleModalUser.isActive ? 'Active' : 'Deactivated'}
                </span>
              </div>
            </div>

            <Select
              label="Select New Role Assignment"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              options={[
                {
                  value: 'CUSTOMER',
                  label: 'CUSTOMER — Can browse, search, and book available service slots',
                },
                {
                  value: 'ORGANISER',
                  label: 'ORGANISER — Can create services, manage fleet resources, schedules & queues',
                },
                {
                  value: 'ADMIN',
                  label: 'ADMIN — Full system governance, role administration, and platform visibility',
                },
              ]}
            />

            {roleModalUser.role === 'ADMIN' && selectedRole !== 'ADMIN' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>⚠️</span> Downgrading Administrative Account
                </p>
                <p>
                  Removing administrator privileges will revoke access to the global console. The platform
                  safety engine will verify at least one other active administrator remains.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: Account Status Toggle (Activate / Deactivate) */}
      {/* ------------------------------------------------------------- */}
      {statusModalUser && (
        <Modal
          isOpen={true}
          onClose={() => setStatusModalUser(null)}
          title={
            statusModalUser.isActive
              ? `Deactivate ${statusModalUser.fullName}?`
              : `Reactivate ${statusModalUser.fullName}?`
          }
          description={
            statusModalUser.isActive
              ? `Deactivating ${statusModalUser.email} will immediately prevent them from logging into ReservePulse.`
              : `Reactivating ${statusModalUser.email} will restore their login access.`
          }
          footer={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusModalUser(null)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button
                variant={statusModalUser.isActive ? 'danger' : 'primary'}
                size="sm"
                onClick={handleConfirmStatusToggle}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus
                  ? 'Saving...'
                  : statusModalUser.isActive
                  ? 'Confirm Deactivation'
                  : 'Restore Access'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {statusModalUser.isActive ? (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <p className="font-bold">Important Safeguard Note:</p>
                <p>
                  Deactivated users cannot authenticate or confirm new reservations. Existing confirmed
                  appointments remain in the ledger for historical auditability.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                <p>Access will be reinstated immediately with their existing role ({statusModalUser.role}).</p>
              </div>
            )}

            <Input
              label="Administrative Reason (Optional Audit Note)"
              placeholder="e.g. Requested account hold, security review, offboarding"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: Provision New User Account */}
      {/* ------------------------------------------------------------- */}
      {isProvisionOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsProvisionOpen(false)}
          title="Provision Platform User"
          description="Directly create an activated user account with assigned role privileges."
          footer={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsProvisionOpen(false)}
                disabled={isSubmittingProvision}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleProvisionUser}
                disabled={isSubmittingProvision}
              >
                {isSubmittingProvision ? 'Provisioning...' : 'Create Account'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Full Name"
              required
              placeholder="e.g. Jordan Miller"
              value={provisionName}
              onChange={(e) => setProvisionName(e.target.value)}
            />

            <Input
              label="Email Address"
              type="email"
              required
              placeholder="e.g. user@reservepulse.com"
              value={provisionEmail}
              onChange={(e) => setProvisionEmail(e.target.value)}
            />

            <Select
              label="Role Privilege"
              value={provisionRole}
              onChange={(e) => setProvisionRole(e.target.value as any)}
              options={[
                { value: 'CUSTOMER', label: 'Customer (Can reserve slots & manage bookings)' },
                { value: 'ORGANISER', label: 'Organiser (Service provider & resource manager)' },
                { value: 'ADMIN', label: 'Admin (Platform-wide governance & management)' },
              ]}
            />

            <Input
              label="Phone Number (Optional)"
              placeholder="+1 555-0199"
              value={provisionPhone}
              onChange={(e) => setProvisionPhone(e.target.value)}
            />

            <Input
              label="Temporary Password (Optional)"
              type="password"
              placeholder="Leave blank for secure system default"
              value={provisionPassword}
              onChange={(e) => setProvisionPassword(e.target.value)}
            />
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: User Detail Inspector */}
      {/* ------------------------------------------------------------- */}
      {inspectUser && (
        <Modal
          isOpen={true}
          onClose={() => setInspectUser(null)}
          title={`User Dossier: ${inspectUser.fullName}`}
          description={`Registered user account profile and platform activity`}
          footer={
            <Button variant="secondary" size="sm" onClick={() => setInspectUser(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4 font-sans text-xs">
            {isLoadingInspect ? (
              <div className="py-8 text-center">
                <Spinner size="md" color="emerald" label="Fetching detailed ledger..." />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                    <span className="font-semibold text-slate-800">{inspectUser.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Role</span>
                    <Badge
                      variant={inspectUser.role === 'ADMIN' ? 'purple' : inspectUser.role === 'ORGANISER' ? 'emerald' : 'blue'}
                      size="xs"
                    >
                      {inspectUser.role}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Access</span>
                    <Badge variant={inspectUser.isActive ? 'emerald' : 'rose'} size="xs" dot>
                      {inspectUser.isActive ? 'Active' : 'Deactivated'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Joined Platform</span>
                    <span className="text-slate-700">{formatDate(inspectUser.createdAt)}</span>
                  </div>
                </div>

                {/* If Organiser: Services & Resources */}
                {inspectUser.role === 'ORGANISER' && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-slate-800 mb-1.5">Managed Services Catalog</h4>
                      {inspectUser.services && inspectUser.services.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {inspectUser.services.map((s: any) => (
                            <div key={s.id} className="p-2 rounded-lg bg-white border border-slate-200 flex justify-between items-center">
                              <span className="font-semibold text-slate-800">{s.name}</span>
                              <Badge variant={s.isPublished ? 'emerald' : 'slate'} size="xs">
                                {s.isPublished ? 'Published' : 'Draft'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">No services registered yet.</p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 mb-1.5">Assigned Resource Fleet</h4>
                      {inspectUser.resources && inspectUser.resources.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {inspectUser.resources.map((r: any) => (
                            <div key={r.id} className="p-2 rounded-lg bg-white border border-slate-200 flex justify-between items-center">
                              <span className="font-semibold text-slate-800">{r.name}</span>
                              <Badge variant={r.status === 'active' ? 'emerald' : 'slate'} size="xs">
                                {r.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">No resources allocated.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* If Customer: Recent Bookings */}
                {inspectUser.role === 'CUSTOMER' && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1.5">Customer Booking Ledger</h4>
                    {inspectUser.recentBookings && inspectUser.recentBookings.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {inspectUser.recentBookings.map((b: any) => (
                          <div key={b.id} className="p-2 rounded-lg bg-white border border-slate-200 flex justify-between items-center">
                            <div>
                              <p className="font-mono font-bold text-slate-800">{b.bookingReference}</p>
                              <p className="text-[10px] text-slate-400">{b.serviceName || 'Service'}</p>
                            </div>
                            <Badge variant={b.status === 'confirmed' ? 'emerald' : b.status === 'pending' ? 'amber' : 'rose'} size="xs">
                              {b.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">No customer reservations found.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
