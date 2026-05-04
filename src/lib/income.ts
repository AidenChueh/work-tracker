export type OvertimeTier = { afterHours: number; rate: number };

export type JobBase = {
  hourlyRate: number | null;
  commissionPercentage: number | null;
  taxEnabled: boolean;
  breakDuration: number | null;
  breakRate: number | null;
  overtimeTiers: OvertimeTier[];
  penaltyRatesEnabled: boolean;
  penaltyBaseRate: number | null;
  publicHolidayRate: number;
  saturdayRate: number;
  sundayRate: number;
  saturdayHourlyRate: number | null;
  sundayHourlyRate: number | null;
  publicHolidayHourlyRate: number | null;
};

export type BreakBase = {
  startTime: string;
  endTime: string | null;
  isPaid: boolean;
};

export type SessionBase = {
  clockIn: string;
  clockOut: string | null;
  job: JobBase;
  breaks: BreakBase[];
  isPublicHoliday: boolean;
  dailyRevenue: number | null;
};

function getPenaltyInfo(session: SessionBase): { multiplier: number; customRate: number | null } {
  if (!session.job.penaltyRatesEnabled) return { multiplier: 1, customRate: null };
  if (session.isPublicHoliday) {
    return {
      multiplier: session.job.publicHolidayRate,
      customRate: session.job.publicHolidayHourlyRate ?? null,
    };
  }
  const dow = new Date(session.clockIn).getDay();
  if (dow === 0) return { multiplier: session.job.sundayRate, customRate: session.job.sundayHourlyRate ?? null };
  if (dow === 6) return { multiplier: session.job.saturdayRate, customRate: session.job.saturdayHourlyRate ?? null };
  return { multiplier: 1, customRate: null };
}

export function calcSessionGross(session: SessionBase): number | null {
  if (!session.clockOut) return null;

  if (session.job.commissionPercentage != null) {
    if (session.dailyRevenue == null) return null;
    return session.dailyRevenue * session.job.commissionPercentage;
  }

  if (session.job.hourlyRate == null) return null;

  const { hourlyRate, breakDuration, breakRate, overtimeTiers, penaltyBaseRate } = session.job;
  const { multiplier, customRate } = getPenaltyInfo(session);

  const totalMs = new Date(session.clockOut).getTime() - new Date(session.clockIn).getTime();
  const manualUnpaidMs = session.breaks
    .filter((b) => !b.isPaid && b.endTime)
    .reduce((sum, b) => sum + (new Date(b.endTime!).getTime() - new Date(b.startTime).getTime()), 0);
  const jobBreakMs = (breakDuration ?? 0) * 60000;
  const workingHours = (totalMs - manualUnpaidMs - jobBreakMs) / 3600000;

  const sorted = [...overtimeTiers].sort((a, b) => a.afterHours - b.afterHours);
  const breakpoints = [0, ...sorted.map((t) => t.afterHours)];

  let effectiveBase: number;
  let effectiveMultiplier: number;
  if (customRate !== null) {
    effectiveBase = customRate;
    effectiveMultiplier = 1;
  } else {
    effectiveBase = multiplier > 1 ? (penaltyBaseRate ?? hourlyRate) : hourlyRate;
    effectiveMultiplier = multiplier;
  }

  const ratesPerSegment = [effectiveBase, ...sorted.map((t) => t.rate)];

  let workGross = 0;
  for (let i = 0; i < breakpoints.length; i++) {
    const from = breakpoints[i];
    if (workingHours <= from) break;
    const to = i + 1 < breakpoints.length ? breakpoints[i + 1] : workingHours;
    workGross += (Math.min(workingHours, to) - from) * ratesPerSegment[i] * effectiveMultiplier;
  }

  const breakGross = breakRate != null ? (jobBreakMs / 3600000) * breakRate : 0;
  return workGross + breakGross;
}

export function calcSessionIncome(session: SessionBase, taxRate: number): number | null {
  const gross = calcSessionGross(session);
  if (gross === null) return null;
  return session.job.taxEnabled && taxRate > 0 ? gross * (1 - taxRate / 100) : gross;
}
