import { db } from '../config/database';
import { logger } from '../utils/logger';
import { BookingService } from './booking.service';
import { ResourceService } from './resource.service';
import { ServiceService } from './service.service';
import { AuthUserPayload } from '../middleware/auth.middleware';
import { AnalyticsQuery } from '../validators/analytics.validator';
import { BookingEntity } from '../models/booking.model';

export interface TimelineDataPoint {
  timestamp: string;
  label: string;
  total: number;
  active: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  pending: number;
}

export interface StatusBreakdownItem {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface HourlyDistributionItem {
  hour: number;
  label: string;
  bookingCount: number;
  percentage: number;
}

export interface PeakHoursAnalysis {
  hourlyDistribution: HourlyDistributionItem[];
  peakHour: number;
  peakHourLabel: string;
  peakCount: number;
  busiestWindow: string;
}

export interface ProviderUtilizationItem {
  providerId: string;
  providerName: string;
  providerType: string;
  totalAppointments: number;
  activeAppointments: number;
  cancelledAppointments: number;
  bookedMinutes: number;
  availableMinutes: number;
  utilizationRate: number;
  avgDurationMinutes: number;
}

export interface AnalyticsSummary {
  totalAppointments: number;
  activeAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  cancellationRate: number;
  totalBookedHours: number;
  avgDurationMinutes: number;
  fleetUtilizationRate: number;
  peakHourLabel: string;
}

export interface AnalyticsOverviewResult {
  summary: AnalyticsSummary;
  trend: TimelineDataPoint[];
  statusBreakdown: StatusBreakdownItem[];
  peakHours: PeakHoursAnalysis;
  providerUtilization: ProviderUtilizationItem[];
  meta: {
    timeFilter: string;
    startDate: string;
    endDate: string;
    scopedOrganiserId: string | null;
  };
}

export class AnalyticsService {
  /**
   * Helper: Resolve start and end dates from timeFilter or custom range
   */
  public static resolveDateRange(query: AnalyticsQuery): {
    startDate: Date;
    endDate: Date;
    interval: 'hour' | 'day';
    timeFilter: string;
  } {
    const now = new Date();
    const timeFilter = (query.timeFilter || 'week').toLowerCase();

    let startDate: Date;
    let endDate: Date;
    let interval: 'hour' | 'day' = 'day';

    if (timeFilter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      interval = 'hour';
    } else if (timeFilter === 'month') {
      // 30 days window
      startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      interval = 'day';
    } else if (timeFilter === 'custom' && query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);

      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      interval = diffDays <= 2 ? 'hour' : 'day';
    } else {
      // Default: 'week' (7 days window)
      startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      interval = 'day';
    }

    return { startDate, endDate, interval, timeFilter };
  }

  /**
   * Helper: Format hour number (0-23) to friendly 12h label
   */
  public static formatHourLabel(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour < 10 ? '0' : ''}${displayHour}:00 ${period}`;
  }

  /**
   * Helper: Check if PostgreSQL pool is active
   */
  private static async isDbConnected(): Promise<boolean> {
    try {
      const res = await db.query('SELECT 1');
      return !!res;
    } catch {
      return false;
    }
  }

  /**
   * Main Method: Calculate comprehensive analytics overview
   */
  public static async getAnalyticsOverview(
    query: AnalyticsQuery,
    user: AuthUserPayload
  ): Promise<AnalyticsOverviewResult> {
    const { startDate, endDate, interval, timeFilter } = this.resolveDateRange(query);

    // Multi-tenant isolation: Organisers are strictly scoped to their own resources & services
    const userRole = (user.role || '').toUpperCase();
    const scopedOrganiserId = userRole === 'ORGANISER' ? user.id : (query.organiserId || null);

    let bookingsInRange: BookingEntity[] = [];

    // Attempt optimized DB query first
    if (await this.isDbConnected()) {
      try {
        let sql = `
          SELECT b.* FROM bookings b
          JOIN services s ON b.service_id = s.id
          WHERE b.start_time >= $1 AND b.start_time <= $2
        `;
        const params: any[] = [startDate, endDate];

        if (scopedOrganiserId) {
          params.push(scopedOrganiserId);
          sql += ` AND s.organiser_id = $${params.length}`;
        }

        if (query.resourceId) {
          params.push(query.resourceId);
          sql += ` AND b.resource_id = $${params.length}`;
        }

        if (query.serviceId) {
          params.push(query.serviceId);
          sql += ` AND b.service_id = $${params.length}`;
        }

        sql += ` ORDER BY b.start_time ASC;`;
        const res = await db.query<BookingEntity>(sql, params);
        bookingsInRange = res.rows;
      } catch (err) {
        logger.warn('Failed to query analytics bookings from DB, falling back to memory', { error: err });
      }
    }

    // In-memory fallback if DB returned empty or errored
    if (bookingsInRange.length === 0) {
      const allMem = Array.from(BookingService.getRawInMemoryBookings().values());
      const filtered: BookingEntity[] = [];

      for (const b of allMem) {
        const bStart = new Date(b.start_time).getTime();
        if (bStart < startDate.getTime() || bStart > endDate.getTime()) {
          continue;
        }

        if (query.resourceId && b.resource_id !== query.resourceId) {
          continue;
        }

        if (query.serviceId && b.service_id !== query.serviceId) {
          continue;
        }

        if (scopedOrganiserId) {
          const rawServices = ServiceService.getRawInMemoryServices();
          const srv = rawServices.get(b.service_id);
          if (srv && srv.organiser_id !== scopedOrganiserId) {
            continue;
          }
        }

        filtered.push(b);
      }

      bookingsInRange = filtered.sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    }

    // -------------------------------------------------------------
    // 1. Calculate Headline Metrics (Summary)
    // -------------------------------------------------------------
    let totalAppointments = bookingsInRange.length;
    let confirmedCount = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let inProgressCount = 0;
    let cancelledCount = 0;
    let totalBookedMinutes = 0;

    for (const b of bookingsInRange) {
      const status = (b.status || '').toLowerCase();
      const isCancelled = status === 'cancelled' || status === 'payment-failed' || status === 'payment_failed';

      if (status === 'confirmed') confirmedCount++;
      else if (status === 'completed') completedCount++;
      else if (status === 'pending') pendingCount++;
      else if (status === 'in_progress') inProgressCount++;
      else if (isCancelled) cancelledCount++;

      // Exclude cancelled bookings from booked duration and utilization calculations
      if (!isCancelled) {
        const start = new Date(b.start_time).getTime();
        const end = new Date(b.end_time).getTime();
        const durationMin = Math.max(0, Math.round((end - start) / (1000 * 60)));
        totalBookedMinutes += durationMin;
      }
    }

    const activeAppointments = totalAppointments - cancelledCount;
    const cancellationRate = totalAppointments > 0 ? Number(((cancelledCount / totalAppointments) * 100).toFixed(1)) : 0;
    const totalBookedHours = Number((totalBookedMinutes / 60).toFixed(1));
    const avgDurationMinutes = activeAppointments > 0 ? Math.round(totalBookedMinutes / activeAppointments) : 0;

    // -------------------------------------------------------------
    // 2. Calculate Status Breakdown
    // -------------------------------------------------------------
    const statusMap: Record<string, { label: string; count: number }> = {
      confirmed: { label: 'Confirmed', count: confirmedCount },
      completed: { label: 'Completed', count: completedCount },
      pending: { label: 'Pending', count: pendingCount },
      in_progress: { label: 'In Progress', count: inProgressCount },
      cancelled: { label: 'Cancelled', count: cancelledCount },
    };

    const statusBreakdown: StatusBreakdownItem[] = Object.entries(statusMap).map(([status, item]) => ({
      status,
      label: item.label,
      count: item.count,
      percentage: totalAppointments > 0 ? Number(((item.count / totalAppointments) * 100).toFixed(1)) : 0,
    }));

    // -------------------------------------------------------------
    // 3. Calculate Peak Booking Hours (Excluding Cancelled Bookings)
    // -------------------------------------------------------------
    const hourCounts: number[] = new Array(24).fill(0);
    let activeHourBookings = 0;

    for (const b of bookingsInRange) {
      const status = (b.status || '').toLowerCase();
      if (status === 'cancelled' || status === 'payment-failed' || status === 'payment_failed') {
        continue;
      }
      const bDate = new Date(b.start_time);
      const hour = bDate.getHours();
      hourCounts[hour]++;
      activeHourBookings++;
    }

    let peakHour = 14; // Default 2 PM
    let peakCount = 0;

    const hourlyDistribution: HourlyDistributionItem[] = hourCounts.map((count, hour) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = hour;
      }
      return {
        hour,
        label: this.formatHourLabel(hour),
        bookingCount: count,
        percentage: activeHourBookings > 0 ? Number(((count / activeHourBookings) * 100).toFixed(1)) : 0,
      };
    });

    const peakHourLabel = this.formatHourLabel(peakHour);
    const windowStart = Math.max(8, peakHour - 2);
    const windowEnd = Math.min(20, peakHour + 2);
    const busiestWindow = `${this.formatHourLabel(windowStart)} - ${this.formatHourLabel(windowEnd)}`;

    // -------------------------------------------------------------
    // 4. Calculate Timeline / Trend Points
    // -------------------------------------------------------------
    const trendMap = new Map<string, TimelineDataPoint>();

    if (interval === 'hour') {
      for (let h = 0; h < 24; h++) {
        const timeKey = `${h < 10 ? '0' : ''}${h}:00`;
        const label = this.formatHourLabel(h);
        trendMap.set(timeKey, {
          timestamp: timeKey,
          label,
          total: 0,
          active: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
        });
      }

      for (const b of bookingsInRange) {
        const bDate = new Date(b.start_time);
        const h = bDate.getHours();
        const timeKey = `${h < 10 ? '0' : ''}${h}:00`;
        const point = trendMap.get(timeKey);
        if (point) {
          const status = (b.status || '').toLowerCase();
          const isCancelled = status === 'cancelled' || status === 'payment-failed' || status === 'payment_failed';
          point.total++;
          if (isCancelled) point.cancelled++;
          else point.active++;
          if (status === 'confirmed') point.confirmed++;
          else if (status === 'completed') point.completed++;
          else if (status === 'pending') point.pending++;
        }
      }
    } else {
      // Group by Day
      const cur = new Date(startDate.getTime());
      while (cur.getTime() <= endDate.getTime()) {
        const dateKey = cur.toISOString().split('T')[0];
        const dayLabel = cur.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        trendMap.set(dateKey, {
          timestamp: dateKey,
          label: dayLabel,
          total: 0,
          active: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
        });
        cur.setDate(cur.getDate() + 1);
      }

      for (const b of bookingsInRange) {
        const bDate = new Date(b.start_time);
        const dateKey = bDate.toISOString().split('T')[0];
        const point = trendMap.get(dateKey);
        if (point) {
          const status = (b.status || '').toLowerCase();
          const isCancelled = status === 'cancelled' || status === 'payment-failed' || status === 'payment_failed';
          point.total++;
          if (isCancelled) point.cancelled++;
          else point.active++;
          if (status === 'confirmed') point.confirmed++;
          else if (status === 'completed') point.completed++;
          else if (status === 'pending') point.pending++;
        }
      }
    }

    const trend = Array.from(trendMap.values());

    // -------------------------------------------------------------
    // 5. Calculate Provider / Resource Utilization
    // -------------------------------------------------------------
    let allResources: any[] = [];
    try {
      allResources = await ResourceService.getOrganiserResources(
        scopedOrganiserId || '',
        undefined,
        !scopedOrganiserId
      );
    } catch {
      allResources = [];
    }

    // Determine timeframe duration in days to calculate available capacity (assume standard 8-hour operational day)
    const timeframeDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const standardAvailableMinutesPerResource = timeframeDays * 8 * 60; // 8 operational hours per day

    const providerUtilization: ProviderUtilizationItem[] = allResources.map((res) => {
      // Find all active bookings for this resource
      const resourceBookings = bookingsInRange.filter((b) => {
        const bResId = b.resource_id;
        return bResId === res.id;
      });

      let resActiveCount = 0;
      let resCancelledCount = 0;
      let resBookedMinutes = 0;

      for (const b of resourceBookings) {
        const status = (b.status || '').toLowerCase();
        if (status === 'cancelled' || status === 'payment-failed' || status === 'payment_failed') {
          resCancelledCount++;
        } else {
          resActiveCount++;
          const start = new Date(b.start_time).getTime();
          const end = new Date(b.end_time).getTime();
          resBookedMinutes += Math.max(0, Math.round((end - start) / (1000 * 60)));
        }
      }

      const availableMinutes = standardAvailableMinutesPerResource * (res.capacity || 1);
      const utilizationRate = availableMinutes > 0
        ? Number(Math.min(100, (resBookedMinutes / availableMinutes) * 100).toFixed(1))
        : 0;
      const avgDuration = resActiveCount > 0 ? Math.round(resBookedMinutes / resActiveCount) : 0;

      return {
        providerId: res.id,
        providerName: res.name,
        providerType: res.resourceType || 'Resource',
        totalAppointments: resourceBookings.length,
        activeAppointments: resActiveCount,
        cancelledAppointments: resCancelledCount,
        bookedMinutes: resBookedMinutes,
        availableMinutes,
        utilizationRate,
        avgDurationMinutes: avgDuration,
      };
    });

    // Average fleet utilization
    const fleetUtilizationRate = providerUtilization.length > 0
      ? Number(
          (
            providerUtilization.reduce((sum, item) => sum + item.utilizationRate, 0) /
            providerUtilization.length
          ).toFixed(1)
        )
      : 0;

    return {
      summary: {
        totalAppointments,
        activeAppointments,
        confirmedAppointments: confirmedCount,
        pendingAppointments: pendingCount,
        completedAppointments: completedCount,
        cancelledAppointments: cancelledCount,
        cancellationRate,
        totalBookedHours,
        avgDurationMinutes,
        fleetUtilizationRate,
        peakHourLabel,
      },
      trend,
      statusBreakdown,
      peakHours: {
        hourlyDistribution,
        peakHour,
        peakHourLabel,
        peakCount,
        busiestWindow,
      },
      providerUtilization,
      meta: {
        timeFilter,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        scopedOrganiserId,
      },
    };
  }
}
