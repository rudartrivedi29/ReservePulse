import React, { useState, useEffect } from 'react';
import {
  Button,
  Badge,
  Spinner,
  useToast,
} from '../../components/ui';
import {
  scheduleClient,
  type DaySchedule,
  type WeeklyScheduleResponse,
} from '../../services/schedule.service';

interface WeeklyScheduleEditorProps {
  resourceId: string;
  resourceName: string;
  onScheduleUpdated?: (schedule: WeeklyScheduleResponse) => void;
}

// Display order: Monday to Sunday
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const timeToMinutes = (timeStr: string): number => {
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0;
  return parts[0] * 60 + parts[1];
};

export const WeeklyScheduleEditor: React.FC<WeeklyScheduleEditorProps> = ({
  resourceId,
  resourceName,
  onScheduleUpdated,
}) => {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  // Fetch schedule whenever resourceId changes
  useEffect(() => {
    let isMounted = true;

    const loadSchedule = async () => {
      setIsLoading(true);
      try {
        const res = await scheduleClient.getResourceSchedule(resourceId);
        if (isMounted && res.data) {
          setSchedule(res.data.schedule);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load working hours';
        toast.error('Schedule Error', msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (resourceId) {
      loadSchedule();
    }

    return () => {
      isMounted = false;
    };
  }, [resourceId, toast]);

  // Validate schedule locally for immediate inline feedback
  const validateSchedule = (days: DaySchedule[]): Record<number, string> => {
    const errors: Record<number, string> = {};

    for (const day of days) {
      if (!day.isAvailable || !day.intervals || day.intervals.length === 0) {
        continue;
      }

      // Check start < end
      for (const interval of day.intervals) {
        const start = timeToMinutes(interval.startTime);
        const end = timeToMinutes(interval.endTime);
        if (start >= end) {
          errors[day.dayOfWeek] = `Invalid interval: ${interval.startTime} must be earlier than ${interval.endTime}`;
          break;
        }
      }

      if (errors[day.dayOfWeek]) continue;

      // Check overlaps
      const sorted = [...day.intervals].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i];
        const next = sorted[i + 1];
        if (timeToMinutes(curr.endTime) > timeToMinutes(next.startTime)) {
          errors[day.dayOfWeek] = `Overlapping intervals: [${curr.startTime} - ${curr.endTime}] overlaps with [${next.startTime} - ${next.endTime}]`;
          break;
        }
      }
    }

    return errors;
  };

  // Handlers
  const handleToggleDay = (dayOfWeek: number) => {
    setSchedule((prev) => {
      const updated = prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const nextAvailable = !day.isAvailable;
          return {
            ...day,
            isAvailable: nextAvailable,
            intervals:
              nextAvailable && day.intervals.length === 0
                ? [{ startTime: '09:00', endTime: '17:00' }]
                : day.intervals,
          };
        }
        return day;
      });
      setValidationErrors(validateSchedule(updated));
      return updated;
    });
  };

  const handleIntervalChange = (
    dayOfWeek: number,
    intervalIndex: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setSchedule((prev) => {
      const updated = prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const newIntervals = [...day.intervals];
          newIntervals[intervalIndex] = {
            ...newIntervals[intervalIndex],
            [field]: value,
          };
          return { ...day, intervals: newIntervals };
        }
        return day;
      });
      setValidationErrors(validateSchedule(updated));
      return updated;
    });
  };

  const handleAddInterval = (dayOfWeek: number) => {
    setSchedule((prev) => {
      const updated = prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          let lastEnd = '17:00';
          if (day.intervals.length > 0) {
            const last = day.intervals[day.intervals.length - 1];
            const endMins = timeToMinutes(last.endTime);
            const newStartMins = Math.min(1380, endMins + 60); // 1 hour after previous end
            const newEndMins = Math.min(1440, newStartMins + 180);
            const sh = Math.floor(newStartMins / 60).toString().padStart(2, '0');
            const sm = (newStartMins % 60).toString().padStart(2, '0');
            const eh = Math.floor(newEndMins / 60).toString().padStart(2, '0');
            const em = (newEndMins % 60).toString().padStart(2, '0');
            return {
              ...day,
              intervals: [...day.intervals, { startTime: `${sh}:${sm}`, endTime: `${eh}:${em}` }],
            };
          }
          return {
            ...day,
            intervals: [...day.intervals, { startTime: '09:00', endTime: lastEnd }],
          };
        }
        return day;
      });
      setValidationErrors(validateSchedule(updated));
      return updated;
    });
  };

  const handleRemoveInterval = (dayOfWeek: number, intervalIndex: number) => {
    setSchedule((prev) => {
      const updated = prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const newIntervals = day.intervals.filter((_, idx) => idx !== intervalIndex);
          return {
            ...day,
            intervals: newIntervals,
            isAvailable: newIntervals.length > 0 ? day.isAvailable : false,
          };
        }
        return day;
      });
      setValidationErrors(validateSchedule(updated));
      return updated;
    });
  };

  const handleCopyMondayToWeekdays = () => {
    const monday = schedule.find((d) => d.dayOfWeek === 1);
    if (!monday) return;

    setSchedule((prev) => {
      const updated = prev.map((day) => {
        // Copy to Tue (2), Wed (3), Thu (4), Fri (5)
        if (day.dayOfWeek >= 2 && day.dayOfWeek <= 5) {
          return {
            ...day,
            isAvailable: monday.isAvailable,
            intervals: monday.intervals.map((i) => ({ ...i })),
          };
        }
        return day;
      });
      setValidationErrors(validateSchedule(updated));
      return updated;
    });

    toast.info(
      'Monday Hours Copied',
      'Monday working schedule has been replicated to Tuesday through Friday.'
    );
  };

  const handleResetToStandard = () => {
    setSchedule((prev) => {
      const updated = prev.map((day) => {
        const isWeekday = day.dayOfWeek >= 1 && day.dayOfWeek <= 5;
        return {
          ...day,
          isAvailable: isWeekday,
          intervals: isWeekday ? [{ startTime: '09:00', endTime: '17:00' }] : [],
        };
      });
      setValidationErrors({});
      return updated;
    });
    toast.info('Schedule Reset', 'Reset to standard business hours (Mon-Fri 09:00 - 17:00).');
  };

  const handleSave = async () => {
    const errors = validateSchedule(schedule);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.warning('Schedule Validation Error', 'Please resolve overlapping periods or invalid times.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await scheduleClient.updateResourceSchedule(resourceId, schedule);
      if (res.data) {
        setSchedule(res.data.schedule);
        if (onScheduleUpdated) {
          onScheduleUpdated(res.data);
        }
        toast.success(
          'Working Hours Saved!',
          `Weekly schedule for "${resourceName}" has been successfully updated.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save working hours';
      toast.error('Save Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3">
        <Spinner size="lg" color="emerald" />
        <p className="text-xs font-semibold text-slate-500 animate-pulse">
          Loading working hours template for {resourceName}...
        </p>
      </div>
    );
  }

  const hasErrors = Object.keys(validationErrors).length > 0;

  return (
    <div className="space-y-5 font-sans">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Weekly Working Hours Template
          </h3>
          <p className="text-xs text-slate-500">
            Configuring operating hours &amp; shifts for <strong className="text-slate-800">{resourceName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="xs"
            onClick={handleCopyMondayToWeekdays}
            title="Replicate Monday hours to Tue-Fri"
          >
            Copy Mon to Weekdays
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleResetToStandard}
          >
            Reset 9-to-5
          </Button>
        </div>
      </div>

      {/* Days Rows */}
      <div className="space-y-3">
        {DAY_ORDER.map((dayNum) => {
          const day = schedule.find((d) => d.dayOfWeek === dayNum);
          if (!day) return null;

          const error = validationErrors[dayNum];
          const isWeekend = dayNum === 0 || dayNum === 6;

          return (
            <div
              key={dayNum}
              className={`p-4 rounded-2xl border transition-all ${
                error
                  ? 'bg-rose-50/70 border-rose-300 shadow-xs'
                  : day.isAvailable
                  ? 'bg-white border-slate-200/80 shadow-xs'
                  : 'bg-slate-50/80 border-slate-200/50'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Day Header & Toggle */}
                <div className="flex items-center gap-3 w-48 shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={day.isAvailable}
                      onChange={() => handleToggleDay(day.dayOfWeek)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>

                  <div>
                    <span
                      className={`text-sm font-bold block ${
                        day.isAvailable ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {day.dayName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isWeekend ? 'Weekend' : 'Weekday'} •{' '}
                      {day.isAvailable ? `${day.intervals.length} shift(s)` : 'Day off'}
                    </span>
                  </div>
                </div>

                {/* Intervals List */}
                <div className="flex-1 space-y-2.5">
                  {day.isAvailable ? (
                    day.intervals.map((interval, idx) => (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                          <input
                            type="time"
                            value={interval.startTime}
                            onChange={(e) =>
                              handleIntervalChange(day.dayOfWeek, idx, 'startTime', e.target.value)
                            }
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-xs font-semibold text-slate-400">to</span>
                          <input
                            type="time"
                            value={interval.endTime}
                            onChange={(e) =>
                              handleIntervalChange(day.dayOfWeek, idx, 'endTime', e.target.value)
                            }
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {day.intervals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInterval(day.dayOfWeek, idx)}
                            title="Remove shift interval"
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-1">
                      <span className="text-xs text-slate-400 italic">
                        Unavailable for appointments (Day Off)
                      </span>
                    </div>
                  )}

                  {/* Inline Error Message */}
                  {error && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 mt-1">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </p>
                  )}
                </div>

                {/* Add Shift Button */}
                {day.isAvailable && (
                  <div className="self-end md:self-center shrink-0">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleAddInterval(day.dayOfWeek)}
                      leftIcon={
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                      }
                    >
                      Add Shift
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          {hasErrors ? (
            <Badge variant="rose" size="xs" dot>
              Validation errors present
            </Badge>
          ) : (
            <Badge variant="emerald" size="xs" dot>
              Schedule valid &amp; ready to save
            </Badge>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={hasErrors || isSaving}
          isLoading={isSaving}
          leftIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          }
        >
          Save Schedule Configuration
        </Button>
      </div>
    </div>
  );
};
