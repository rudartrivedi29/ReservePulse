import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Select,
  Spinner,
  useToast,
  type CalendarSlotStatus,
} from '../components/ui';
import { useAuth } from '../context/useAuth';
import { resourceClient, type ResourceItem } from '../services/resource.service';
import {
  scheduleClient,
  type NormalizedAvailabilityResponse,
  type NormalizedAvailabilityDay,
  type WeeklyScheduleResponse,
} from '../services/schedule.service';
import { WeeklyScheduleEditor } from './scheduling';

type ActiveTab = 'editor' | 'inspector';

export const CalendarPage: React.FC = () => {
  const { toast } = useToast();
  const { role, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Resource state
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [isLoadingResources, setIsLoadingResources] = useState<boolean>(true);

  // Tab state
  const isOrganiserOrAdmin = role === 'organiser' || role === 'admin';
  const [activeTab, setActiveTab] = useState<ActiveTab>(isOrganiserOrAdmin ? 'editor' : 'inspector');

  // Sync activeTab when role changes
  useEffect(() => {
    if (!isOrganiserOrAdmin && activeTab === 'editor') {
      setActiveTab('inspector');
    }
  }, [isOrganiserOrAdmin, activeTab]);

  // Inspector state
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [dateRangeMode, setDateRangeMode] = useState<'day' | 'week'>('day');
  const [availabilityData, setAvailabilityData] = useState<NormalizedAvailabilityResponse | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState<boolean>(false);

  // Load resources: organiser-specific if authenticated organiser/admin, else public resources
  useEffect(() => {
    let isMounted = true;

    const loadResources = async () => {
      setIsLoadingResources(true);
      try {
        let list: ResourceItem[] = [];
        if (isOrganiserOrAdmin && token) {
          const res = await resourceClient.getOrganiserResources();
          if (res.data) list = res.data;
        } else {
          const res = await resourceClient.getPublicResources().catch(() => ({ data: [] }));
          if (res.data) list = res.data;
        }

        if (isMounted) {
          setResources(list);

          // Check if resourceId was supplied in query params
          const queryResourceId = searchParams.get('resourceId');
          if (queryResourceId && list.some((r) => r.id === queryResourceId)) {
            setSelectedResourceId(queryResourceId);
          } else if (list.length > 0) {
            setSelectedResourceId(list[0].id);
          }
        }
      } catch (err: unknown) {
        if (isMounted && isOrganiserOrAdmin && token) {
          const msg = err instanceof Error ? err.message : 'Failed to load resources';
          toast.error('Resource Fetch Error', msg);
        }
      } finally {
        if (isMounted) setIsLoadingResources(false);
      }
    };

    loadResources();

    return () => {
      isMounted = false;
    };
  }, [searchParams, isOrganiserOrAdmin, token]);

  // Sync selected resource ID to query params
  const handleSelectResource = (id: string) => {
    setSelectedResourceId(id);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('resourceId', id);
    setSearchParams(newParams, { replace: true });
  };

  const currentResource = useMemo(
    () => resources.find((r) => r.id === selectedResourceId),
    [resources, selectedResourceId]
  );

  // Calculate start & end date string for availability inspector
  const { startDateStr, endDateStr } = useMemo(() => {
    const base = selectedDate || new Date();
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    if (dateRangeMode === 'week') {
      end.setDate(end.getDate() + 6);
    }

    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      startDateStr: formatYMD(start),
      endDateStr: formatYMD(end),
    };
  }, [selectedDate, dateRangeMode]);

  // Fetch normalized availability
  const loadNormalizedAvailability = useCallback(async () => {
    if (!selectedResourceId || !startDateStr || !endDateStr) return;

    setIsLoadingAvailability(true);
    try {
      const res = await scheduleClient.getNormalizedAvailability(
        selectedResourceId,
        startDateStr,
        endDateStr
      );
      if (res.data) {
        setAvailabilityData(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not fetch availability';
      toast.error('Availability Error', msg);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [selectedResourceId, startDateStr, endDateStr, toast]);

  useEffect(() => {
    if (selectedResourceId && activeTab === 'inspector') {
      loadNormalizedAvailability();
    }
  }, [selectedResourceId, startDateStr, endDateStr, activeTab, loadNormalizedAvailability]);

  // Re-fetch availability after schedule changes
  const handleScheduleSaved = (_savedSchedule: WeeklyScheduleResponse) => {
    if (activeTab === 'inspector') {
      loadNormalizedAvailability();
    }
  };

  // Calendar slot status calculator for the interactive Calendar widget
  const getCalendarStatus = (date: Date): CalendarSlotStatus => {
    if (!availabilityData) {
      const day = date.getDate();
      if (day % 7 === 0) return 'full';
      if (day % 2 === 0) return 'available';
      return 'limited';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${day}`;

    const matchingDay = availabilityData.days.find((d) => d.date === key);
    if (!matchingDay || !matchingDay.isAvailable || matchingDay.workingIntervals.length === 0) {
      return 'full';
    }
    return 'available';
  };

  // Format minutes into human readable duration
  const formatMinutesDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} mins`;
    if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`;
    return `${h} hr${h > 1 ? 's' : ''} ${m} min${m > 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Fleet Resource Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Fleet Scheduling & Working Hours
            </h2>
            <Badge variant="emerald" size="xs">
              Normalized Engine
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Define recurring weekly schedules for resources, prevent overlapping shifts, and inspect availability inputs for the reservation engine.
          </p>
        </div>

        {/* Resource Selector & Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {isLoadingResources ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
              <Spinner size="sm" color="emerald" />
              <span>Loading fleet resources...</span>
            </div>
          ) : resources.length > 0 ? (
            <div className="w-full sm:w-72">
              <Select
                value={selectedResourceId}
                onChange={(e) => handleSelectResource(e.target.value)}
                options={resources.map((r) => ({
                  value: r.id,
                  label: `${r.name} (${r.resourceType} • Cap: ${r.capacity})`,
                }))}
              />
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/organiser/resources')}
            >
              Add Resource First
            </Button>
          )}

          {/* Tab Switcher Pills */}
          {isOrganiserOrAdmin && (
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
                  ${
                    activeTab === 'editor'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }
                `.trim()}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Weekly Hours</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('inspector')}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
                  ${
                    activeTab === 'inspector'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }
                `.trim()}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Availability Inspector</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoadingResources ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" color="emerald" />
          <p className="text-xs text-slate-500 font-medium">Fetching fleet roster...</p>
        </div>
      ) : resources.length === 0 ? (
        <Card variant="glass" className="p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">No Resources Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
            You must have at least one active resource or provider configured in your fleet before defining recurring working hours.
          </p>
          <Button onClick={() => navigate('/organiser/resources')}>
            Create First Resource
          </Button>
        </Card>
      ) : currentResource ? (
        <div>
          {/* Active Tab: Weekly Working Hours Editor */}
          {activeTab === 'editor' && (
            <div className="space-y-6">
              {/* Resource Meta Highlight Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Active Resource:</span>
                  <span className="font-bold text-slate-900">{currentResource.name}</span>
                  <Badge variant="outline" size="xs">
                    {currentResource.resourceType}
                  </Badge>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">Capacity: {currentResource.capacity}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">{currentResource.location || 'Location: Remote/Unspecified'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={currentResource.isActive ? 'emerald' : 'slate'}
                    size="xs"
                    dot
                    pulseDot={currentResource.isActive}
                  >
                    {currentResource.isActive ? 'Resource Online' : 'Resource Inactive'}
                  </Badge>
                </div>
              </div>

              {/* Weekly Schedule Editor Component */}
              <WeeklyScheduleEditor
                resourceId={currentResource.id}
                resourceName={currentResource.name}
                onScheduleUpdated={handleScheduleSaved}
              />
            </div>
          )}

          {/* Active Tab: Normalized Availability & Calendar Inspector */}
          {activeTab === 'inspector' && (
            <div className="space-y-6">
              {/* Range Mode & Synchronizer Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ⚡
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      Slot Engine Contract Verification
                    </h4>
                    <p className="text-[11px] text-emerald-800">
                      Real-time normalized availability output generated by the backend scheduling engine for {currentResource.name}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex p-0.5 bg-white rounded-lg border border-emerald-200">
                    <button
                      type="button"
                      onClick={() => setDateRangeMode('day')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        dateRangeMode === 'day'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Single Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateRangeMode('week')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        dateRangeMode === 'week'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      7-Day Window
                    </button>
                  </div>

                  <Button
                    size="xs"
                    variant="outline"
                    onClick={loadNormalizedAvailability}
                    disabled={isLoadingAvailability}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Inspector Grid: Calendar on Left, Timeline / Contract on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Interactive Calendar */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <Calendar
                    selectedDate={selectedDate}
                    onSelectDate={(d) => {
                      setSelectedDate(d);
                    }}
                    getDateStatus={getCalendarStatus}
                  />

                  <div className="w-full mt-3 p-3 bg-white rounded-xl border border-slate-200/80 text-[11px] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold text-slate-800">Calendar Legend</span>
                      <span className="text-[10px] text-slate-400">Status Matrix</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span>Working Shifts Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                        <span>Unavailable / Off</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Normalized Working Intervals Breakdown */}
                <div className="lg:col-span-7 space-y-4">
                  <Card variant="glass">
                    <CardHeader>
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900">
                          {selectedDate
                            ? dateRangeMode === 'day'
                              ? selectedDate.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : `7-Day Availability Forecast (From ${selectedDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })})`
                            : 'Selected Date'}
                        </CardTitle>
                        <CardDescription>
                          Normalized intervals for <strong className="text-slate-800">{currentResource.name}</strong> (Capacity: {currentResource.capacity})
                        </CardDescription>
                      </div>

                      <Badge variant="emerald" size="xs" dot pulseDot>
                        Clean Contract
                      </Badge>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {isLoadingAvailability ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-2">
                          <Spinner size="md" color="emerald" />
                          <p className="text-xs text-slate-500 font-medium">Calculating normalized intervals...</p>
                        </div>
                      ) : availabilityData && availabilityData.days.length > 0 ? (
                        <div className="space-y-4">
                          {availabilityData.days.map((dayItem: NormalizedAvailabilityDay) => {
                            const isOff = !dayItem.isAvailable || dayItem.workingIntervals.length === 0;

                            return (
                              <div
                                key={dayItem.date}
                                className={`p-4 rounded-xl border transition-all ${
                                  isOff
                                    ? 'bg-slate-50/70 border-slate-200/80'
                                    : 'bg-white border-slate-200 shadow-2xs hover:border-emerald-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800">
                                      {dayItem.dayName}
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-500">
                                      {dayItem.date}
                                    </span>
                                  </div>

                                  <Badge
                                    variant={isOff ? 'slate' : 'emerald'}
                                    size="xs"
                                    dot
                                  >
                                    {isOff ? 'No Shifts / Day Off' : `${dayItem.workingIntervals.length} Shift Window${dayItem.workingIntervals.length > 1 ? 's' : ''}`}
                                  </Badge>
                                </div>

                                {isOff ? (
                                  <p className="text-xs text-slate-400 italic">
                                    Resource is not scheduled to work on this calendar day.
                                  </p>
                                ) : (
                                  <div className="space-y-2 mt-3">
                                    {dayItem.workingIntervals.map((interval, idx) => (
                                      <div
                                        key={idx}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-emerald-50/30 border border-emerald-200/50 gap-2"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded">
                                            {interval.startTime} – {interval.endTime}
                                          </span>
                                          <span className="text-xs font-medium text-slate-700">
                                            {formatMinutesDuration(interval.durationMinutes)}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                                            Offset: {interval.startMinutes}m - {interval.endMinutes}m
                                          </span>
                                          <span className="text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                                            Dur: {interval.durationMinutes}m
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-500">
                          No availability data returned for the selected range.
                        </div>
                      )}

                      {/* Engine Architecture Explainer Card */}
                      <div className="mt-4 p-3.5 rounded-xl bg-slate-900 text-slate-200 text-xs space-y-1.5 font-sans">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Slot Engine Normalization Contract</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          These normalized windows guarantee sorted, non-overlapping intervals with pre-calculated minute offsets. The future slot generation engine will map customer appointment types directly onto these slices without re-evaluating recurring weekly rules.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
