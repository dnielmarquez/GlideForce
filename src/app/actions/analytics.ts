'use server';

import { createAdminClient } from '@/utils/supabase/admin';

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'custom';

export interface AnalyticsFilterParams {
  period: AnalyticsPeriod;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface DayMetricPoint {
  date: string;          // YYYY-MM-DD
  label: string;         // e.g. "Lun 16"
  revenueCOP: number;
  bookingsCount: number;
  paymentsCount: number;
}

export interface PackageRankingItem {
  id: string;
  title: string;
  starsQuantity: number;
  priceCOP: number;
  salesCount: number;
  revenueCOP: number;
  percentOfTotal: number;
}

export interface CouponRankingItem {
  id: string;
  code: string;
  title: string;
  discountType: '2_for_1' | 'percentage' | 'fixed_amount';
  discountValue: number;
  usageCount: number;         // en el periodo seleccionado
  allTimeUsageCount: number;  // total histórico
  lastUsedAt: string | null;
}

export interface ClassRankingItem {
  title: string;
  bookingsCount: number;
  instructorName: string;
}

export interface InstructorRankingItem {
  name: string;
  bookingsCount: number;
}

export interface AdminAnalyticsData {
  period: AnalyticsPeriod;
  dateRange: {
    startStr: string;
    endStr: string;
  };
  kpis: {
    totalRevenueCOP: number;
    approvedPaymentsCount: number;
    totalPaymentsCount: number;
    paymentsConversionRate: number;
    averageTicketCOP: number;
    
    totalBookingsCount: number;
    confirmedBookingsCount: number;
    completedBookingsCount: number;
    cancelledBookingsCount: number;
    noShowBookingsCount: number;
    cancellationRate: number;
    
    totalPackagesSold: number;
    totalStarsDelivered: number;
    totalStarsSpent: number;
    
    totalCouponsUsed: number;
    allTimeCouponsUsed: number;
    newMembersCount: number;
  };
  timeline: DayMetricPoint[];
  topPackages: PackageRankingItem[];
  topCoupons: CouponRankingItem[];
  topClasses: ClassRankingItem[];
  topInstructors: InstructorRankingItem[];
  paymentStatusBreakdown: {
    approved: number;
    pending: number;
    declined: number;
    error: number;
    voidedOrExpired: number;
  };
  purposeBreakdown: {
    starPurchaseRevenue: number;
    classBookingRevenue: number;
    starPurchaseCount: number;
    classBookingCount: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBogotaDateString(d: Date = new Date()): string {
  // Bogota is UTC-5
  const bogotaMs = d.getTime() - 5 * 60 * 60 * 1000;
  return new Date(bogotaMs).toISOString().split('T')[0];
}

function resolveDateRange(params: AnalyticsFilterParams): { startIso: string; endIso: string; startDay: string; endDay: string } {
  const now = new Date();
  const todayBogota = getBogotaDateString(now);

  let startDay = todayBogota;
  let endDay = todayBogota;

  if (params.period === 'today') {
    startDay = todayBogota;
    endDay = todayBogota;
  } else if (params.period === 'week') {
    const past7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    startDay = getBogotaDateString(past7);
    endDay = todayBogota;
  } else if (params.period === 'month') {
    const past30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    startDay = getBogotaDateString(past30);
    endDay = todayBogota;
  } else if (params.period === 'custom') {
    startDay = params.startDate || todayBogota;
    endDay = params.endDate || todayBogota;
    if (startDay > endDay) {
      const temp = startDay;
      startDay = endDay;
      endDay = temp;
    }
  }

  // Convert Bogota day bounds (00:00:00 to 23:59:59.999) to UTC ISO
  // Bogota is UTC-5, so 00:00:00 Bogota = 05:00:00 UTC
  const startIso = new Date(`${startDay}T00:00:00-05:00`).toISOString();
  const endIso = new Date(`${endDay}T23:59:59.999-05:00`).toISOString();

  return { startIso, endIso, startDay, endDay };
}

function formatDayLabel(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

export async function getAdminAnalytics(params: AnalyticsFilterParams): Promise<AdminAnalyticsData> {
  const admin = createAdminClient();
  const { startIso, endIso, startDay, endDay } = resolveDateRange(params);

  // 1. Fetch Payments in date range
  const { data: paymentsData, error: paymentsErr } = await (admin as any)
    .from('payments')
    .select('id, amount_in_cents, status, purpose, package_id, coupon_id, created_at, session_id, stars_to_credit')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: true });

  if (paymentsErr) {
    console.error('[getAdminAnalytics] Error fetching payments:', paymentsErr);
  }
  const payments = (paymentsData as any[]) || [];

  // 2. Fetch Bookings in date range
  const { data: bookingsData, error: bookingsErr } = await (admin as any)
    .from('bookings')
    .select(`
      id,
      status,
      stars_spent,
      created_at,
      class_sessions (
        id,
        title,
        instructor_id,
        instructors ( name )
      )
    `)
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (bookingsErr) {
    console.error('[getAdminAnalytics] Error fetching bookings:', bookingsErr);
  }
  const bookings = (bookingsData as any[]) || [];

  // 3. Fetch Packages Catalog for metadata
  const { data: packagesData } = await (admin as any)
    .from('packages')
    .select('id, title, stars_quantity, price_cop, badge');
  const packagesList = (packagesData as any[]) || [];
  const packageMap = new Map<string, any>(packagesList.map(p => [p.id, p]));

  // 4. Fetch Coupons Catalog & Historical Usages
  const [couponsRes, allCouponPaymentsRes, periodCouponUsagesRes] = await Promise.all([
    (admin as any).from('coupons').select('id, title, code, discount_type, discount_value'),
    (admin as any).from('payments').select('id, coupon_id, status, created_at').not('coupon_id', 'is', null),
    (admin as any).from('coupon_usages').select('id, coupon_id, user_id, used_at').gte('used_at', startIso).lte('used_at', endIso)
  ]);

  const couponsList = (couponsRes.data as any[]) || [];
  const allCouponPayments = (allCouponPaymentsRes.data as any[]) || [];
  const periodCouponUsages = (periodCouponUsagesRes.data as any[]) || [];

  // 5. Fetch New Members Registered in date range
  const { count: newMembersCount } = await (admin as any)
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .eq('role', 'member');

  // ── Compute KPIs ───────────────────────────────────────────────────────────
  let totalRevenueCents = 0;
  let approvedPaymentsCount = 0;
  let declinedPaymentsCount = 0;
  let pendingPaymentsCount = 0;
  let errorPaymentsCount = 0;
  let voidedOrExpiredCount = 0;

  let starPurchaseRevenue = 0;
  let classBookingRevenue = 0;
  let starPurchaseCount = 0;
  let classBookingCount = 0;
  let totalStarsDelivered = 0;

  // Track package sales from approved payments
  const packageSalesCounts = new Map<string, { count: number; revenueCents: number }>();

  payments.forEach((p: any) => {
    if (p.status === 'approved') {
      approvedPaymentsCount++;
      totalRevenueCents += p.amount_in_cents || 0;

      if (p.purpose === 'star_purchase') {
        starPurchaseRevenue += (p.amount_in_cents || 0) / 100;
        starPurchaseCount++;
        totalStarsDelivered += (p.stars_to_credit || 0);
      } else {
        classBookingRevenue += (p.amount_in_cents || 0) / 100;
        classBookingCount++;
      }

      if (p.package_id) {
        const curr = packageSalesCounts.get(p.package_id) || { count: 0, revenueCents: 0 };
        curr.count += 1;
        curr.revenueCents += (p.amount_in_cents || 0);
        packageSalesCounts.set(p.package_id, curr);
      }
    } else if (p.status === 'pending') {
      pendingPaymentsCount++;
    } else if (p.status === 'declined') {
      declinedPaymentsCount++;
    } else if (p.status === 'error') {
      errorPaymentsCount++;
    } else {
      voidedOrExpiredCount++;
    }
  });

  const totalRevenueCOP = totalRevenueCents / 100;
  const totalPaymentsCount = payments.length;
  const paymentsConversionRate = totalPaymentsCount > 0 
    ? Math.round((approvedPaymentsCount / totalPaymentsCount) * 1000) / 10 
    : 0;
  const averageTicketCOP = approvedPaymentsCount > 0 
    ? Math.round(totalRevenueCOP / approvedPaymentsCount) 
    : 0;

  // Bookings breakdown
  let confirmedBookingsCount = 0;
  let completedBookingsCount = 0;
  let cancelledBookingsCount = 0;
  let noShowBookingsCount = 0;
  let totalStarsSpent = 0;

  const classCounts = new Map<string, { count: number; instructor: string }>();
  const instructorCounts = new Map<string, number>();

  bookings.forEach((b: any) => {
    if (b.status === 'confirmed') confirmedBookingsCount++;
    else if (b.status === 'completed') completedBookingsCount++;
    else if (b.status === 'cancelled') cancelledBookingsCount++;
    else if (b.status === 'no_show') noShowBookingsCount++;

    if (b.status !== 'cancelled') {
      totalStarsSpent += (b.stars_spent || 0);
    }

    const session = b.class_sessions;
    if (session && b.status !== 'cancelled') {
      const title = session.title || 'Clase';
      const instructor = session.instructors?.name || 'Instructor';
      const currentClass = classCounts.get(title) || { count: 0, instructor };
      currentClass.count += 1;
      classCounts.set(title, currentClass);

      instructorCounts.set(instructor, (instructorCounts.get(instructor) || 0) + 1);
    }
  });

  const totalBookingsCount = bookings.length;
  const cancellationRate = totalBookingsCount > 0
    ? Math.round((cancelledBookingsCount / totalBookingsCount) * 1000) / 10
    : 0;

  // ── Compute Day-by-day Timeline ────────────────────────────────────────────
  // Create an array of date strings between startDay and endDay
  const dayPointsMap = new Map<string, DayMetricPoint>();
  const currentCursor = new Date(`${startDay}T12:00:00-05:00`);
  const endCursor = new Date(`${endDay}T12:00:00-05:00`);

  while (currentCursor <= endCursor) {
    const dayStr = currentCursor.toISOString().split('T')[0];
    dayPointsMap.set(dayStr, {
      date: dayStr,
      label: formatDayLabel(dayStr),
      revenueCOP: 0,
      bookingsCount: 0,
      paymentsCount: 0,
    });
    currentCursor.setDate(currentCursor.getDate() + 1);
  }

  // Populate payments into day map
  payments.forEach((p: any) => {
    const dayStr = getBogotaDateString(new Date(p.created_at));
    const point = dayPointsMap.get(dayStr);
    if (point) {
      point.paymentsCount++;
      if (p.status === 'approved') {
        point.revenueCOP += (p.amount_in_cents || 0) / 100;
      }
    }
  });

  // Populate bookings into day map
  bookings.forEach((b: any) => {
    const dayStr = getBogotaDateString(new Date(b.created_at));
    const point = dayPointsMap.get(dayStr);
    if (point) {
      point.bookingsCount++;
    }
  });

  const timeline = Array.from(dayPointsMap.values());

  // ── Top Packages ───────────────────────────────────────────────────────────
  let totalPackagesSold = 0;
  const topPackages: PackageRankingItem[] = [];

  packagesList.forEach((pkg: any) => {
    const sales = packageSalesCounts.get(pkg.id);
    const count = sales?.count || 0;
    const revenueCOP = (sales?.revenueCents || 0) / 100;
    totalPackagesSold += count;

    if (count > 0 || packagesList.length <= 5) {
      topPackages.push({
        id: pkg.id,
        title: pkg.title,
        starsQuantity: pkg.stars_quantity,
        priceCOP: pkg.price_cop,
        salesCount: count,
        revenueCOP,
        percentOfTotal: 0,
      });
    }
  });

  // Calculate percentages and sort
  topPackages.sort((a, b) => b.salesCount - a.salesCount || b.revenueCOP - a.revenueCOP);
  topPackages.forEach(p => {
    p.percentOfTotal = totalPackagesSold > 0 ? Math.round((p.salesCount / totalPackagesSold) * 100) : 0;
  });

  // ── Top Coupons ────────────────────────────────────────────────────────────
  let periodCouponsUsedCount = 0;
  let allTimeCouponsUsedCount = 0;

  const couponStatsMap = new Map<string, {
    periodCount: number;
    allTimeCount: number;
    lastUsedAt: string | null;
  }>();

  couponsList.forEach((c: any) => {
    couponStatsMap.set(c.id, {
      periodCount: 0,
      allTimeCount: 0,
      lastUsedAt: null,
    });
  });

  // Approved payments with coupon in the active period
  payments.forEach((p: any) => {
    if (p.coupon_id && p.status === 'approved') {
      periodCouponsUsedCount++;
      const stat = couponStatsMap.get(p.coupon_id) || { periodCount: 0, allTimeCount: 0, lastUsedAt: null };
      stat.periodCount += 1;
      if (!stat.lastUsedAt || p.created_at > stat.lastUsedAt) {
        stat.lastUsedAt = p.created_at;
      }
      couponStatsMap.set(p.coupon_id, stat);
    }
  });

  // Also include period coupon_usages if not counted yet
  periodCouponUsages.forEach((u: any) => {
    if (u.coupon_id) {
      const stat = couponStatsMap.get(u.coupon_id) || { periodCount: 0, allTimeCount: 0, lastUsedAt: null };
      if (!stat.lastUsedAt || u.used_at > stat.lastUsedAt) {
        stat.lastUsedAt = u.used_at;
      }
      couponStatsMap.set(u.coupon_id, stat);
    }
  });

  // All-time approved payments with coupon
  allCouponPayments.forEach((p: any) => {
    if (p.coupon_id && p.status === 'approved') {
      allTimeCouponsUsedCount++;
      const stat = couponStatsMap.get(p.coupon_id) || { periodCount: 0, allTimeCount: 0, lastUsedAt: null };
      stat.allTimeCount += 1;
      if (!stat.lastUsedAt || p.created_at > stat.lastUsedAt) {
        stat.lastUsedAt = p.created_at;
      }
      couponStatsMap.set(p.coupon_id, stat);
    }
  });

  const topCoupons: CouponRankingItem[] = couponsList.map((c: any) => {
    const stat = couponStatsMap.get(c.id) || { periodCount: 0, allTimeCount: 0, lastUsedAt: null };
    return {
      id: c.id,
      code: c.code,
      title: c.title,
      discountType: c.discount_type || 'percentage',
      discountValue: Number(c.discount_value || 0),
      usageCount: stat.periodCount,
      allTimeUsageCount: stat.allTimeCount,
      lastUsedAt: stat.lastUsedAt,
    };
  })
  .filter(c => c.allTimeUsageCount > 0 || c.usageCount > 0)
  .sort((a, b) => b.usageCount - a.usageCount || b.allTimeUsageCount - a.allTimeUsageCount);

  // ── Top Classes & Instructors ──────────────────────────────────────────────
  const topClasses: ClassRankingItem[] = Array.from(classCounts.entries())
    .map(([title, val]) => ({
      title,
      bookingsCount: val.count,
      instructorName: val.instructor,
    }))
    .sort((a, b) => b.bookingsCount - a.bookingsCount)
    .slice(0, 6);

  const topInstructors: InstructorRankingItem[] = Array.from(instructorCounts.entries())
    .map(([name, count]) => ({
      name,
      bookingsCount: count,
    }))
    .sort((a, b) => b.bookingsCount - a.bookingsCount)
    .slice(0, 5);

  return {
    period: params.period,
    dateRange: {
      startStr: startDay,
      endStr: endDay,
    },
    kpis: {
      totalRevenueCOP,
      approvedPaymentsCount,
      totalPaymentsCount,
      paymentsConversionRate,
      averageTicketCOP,
      totalBookingsCount,
      confirmedBookingsCount,
      completedBookingsCount,
      cancelledBookingsCount,
      noShowBookingsCount,
      cancellationRate,
      totalPackagesSold,
      totalStarsDelivered,
      totalStarsSpent,
      totalCouponsUsed: periodCouponsUsedCount,
      allTimeCouponsUsed: allTimeCouponsUsedCount,
      newMembersCount: newMembersCount || 0,
    },
    timeline,
    topPackages,
    topCoupons,
    topClasses,
    topInstructors,
    paymentStatusBreakdown: {
      approved: approvedPaymentsCount,
      pending: pendingPaymentsCount,
      declined: declinedPaymentsCount,
      error: errorPaymentsCount,
      voidedOrExpired: voidedOrExpiredCount,
    },
    purposeBreakdown: {
      starPurchaseRevenue,
      classBookingRevenue,
      starPurchaseCount,
      classBookingCount,
    },
  };
}
