type CronField = {
  values: Set<number>;
};

export type ParsedCron = {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
};

export const parseCronExpression = (expression: string): ParsedCron => {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error("cron expression must have 5 fields: minute hour day month weekday");
  }
  return {
    minute: parseField(parts[0] ?? "*", 0, 59),
    hour: parseField(parts[1] ?? "*", 0, 23),
    dayOfMonth: parseField(parts[2] ?? "*", 1, 31),
    month: parseField(parts[3] ?? "*", 1, 12),
    dayOfWeek: parseField(parts[4] ?? "*", 0, 7, true),
  };
};

export const nextCronFire = (expression: string, from: Date = new Date()): Date => {
  const cron = parseCronExpression(expression);
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  for (let step = 0; step < 525600; step += 1) {
    if (matchesCron(cron, cursor)) {
      return cursor;
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  throw new Error("no next fire time within one year");
};

const matchesCron = (cron: ParsedCron, date: Date): boolean => {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const weekday = date.getDay();
  return (
    cron.minute.values.has(minute) &&
    cron.hour.values.has(hour) &&
    cron.dayOfMonth.values.has(day) &&
    cron.month.values.has(month) &&
    (cron.dayOfWeek.values.has(weekday) || cron.dayOfWeek.values.has(weekday === 0 ? 7 : weekday))
  );
};

const parseField = (
  raw: string,
  min: number,
  max: number,
  normalizeSunday = false,
): CronField => {
  const values = new Set<number>();
  for (const segment of raw.split(",")) {
    expandSegment(segment.trim(), min, max, normalizeSunday).forEach((value) => values.add(value));
  }
  return { values };
};

const expandSegment = (
  segment: string,
  min: number,
  max: number,
  normalizeSunday: boolean,
): number[] => {
  const [base, stepRaw] = segment.split("/");
  const step = stepRaw ? Number(stepRaw) : 1;
  if (!Number.isFinite(step) || step < 1) {
    throw new Error(`invalid cron step: ${segment}`);
  }
  const range = parseRange(base ?? "*", min, max, normalizeSunday);
  const values: number[] = [];
  for (let value = range.start; value <= range.end; value += step) {
    values.push(normalizeSunday && value === 7 ? 0 : value);
  }
  return values;
};

const parseRange = (
  raw: string,
  min: number,
  max: number,
  normalizeSunday: boolean,
): { start: number; end: number } => {
  if (raw === "*") {
    return { start: min, end: max };
  }
  if (raw.includes("-")) {
    const [startRaw, endRaw] = raw.split("-");
    const start = Number(startRaw);
    const end = Number(endRaw);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error(`invalid cron range: ${raw}`);
    }
    return { start, end };
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`invalid cron value: ${raw}`);
  }
  if (normalizeSunday && value === 7) {
    return { start: 0, end: 0 };
  }
  return { start: value, end: value };
};
