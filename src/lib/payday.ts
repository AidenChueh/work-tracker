type Job = {
  id: string;
  hourlyRate: number | null;
  payFrequency: string;
  payDay: number | null;
  createdAt: string;
};

type WorkSession = {
  jobId: string;
  clockIn: string;
  clockOut: string | null;
};

export function getNextPayday(job: Job): Date | null {
  if (job.payDay === null || job.payDay === undefined) {
    if (job.payFrequency !== "bi_weekly") return null;
  }

  const now = new Date();

  switch (job.payFrequency) {
    case "weekly": {
      const dayOfWeek = now.getDay();
      let daysUntil = job.payDay! - dayOfWeek;
      if (daysUntil <= 0) daysUntil += 7;
      const next = new Date(now);
      next.setDate(now.getDate() + daysUntil);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    case "bi_weekly": {
      const ref = new Date(job.createdAt);
      ref.setHours(0, 0, 0, 0);
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const daysSinceRef = Math.floor((today.getTime() - ref.getTime()) / 86400000);
      const daysIntoCycle = daysSinceRef % 14;
      const daysUntilNext = daysIntoCycle === 0 ? 14 : 14 - daysIntoCycle;
      const next = new Date(today);
      next.setDate(today.getDate() + daysUntilNext);
      return next;
    }
    case "monthly": {
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), job.payDay!);
      if (thisMonth > now) return thisMonth;
      return new Date(now.getFullYear(), now.getMonth() + 1, job.payDay!);
    }
    default:
      return null;
  }
}

export function getPayPeriodStart(job: Job): Date | null {
  const next = getNextPayday(job);
  if (!next) return null;

  switch (job.payFrequency) {
    case "weekly": {
      const start = new Date(next);
      start.setDate(start.getDate() - 7);
      return start;
    }
    case "bi_weekly": {
      const start = new Date(next);
      start.setDate(start.getDate() - 14);
      return start;
    }
    case "monthly": {
      if (job.payDay === null) return null;
      const now = new Date();
      const thisMonthPayday = new Date(now.getFullYear(), now.getMonth(), job.payDay);
      if (thisMonthPayday <= now) return thisMonthPayday;
      return new Date(now.getFullYear(), now.getMonth() - 1, job.payDay);
    }
    default:
      return null;
  }
}

export function calculateHoursInPeriod(
  sessions: WorkSession[],
  periodStart: Date,
  jobId: string
): number {
  const totalMs = sessions
    .filter((s) => s.jobId === jobId && s.clockOut && new Date(s.clockIn) >= periodStart)
    .reduce(
      (acc, s) => acc + (new Date(s.clockOut!).getTime() - new Date(s.clockIn).getTime()),
      0
    );
  return totalMs / 3600000;
}

export function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}
