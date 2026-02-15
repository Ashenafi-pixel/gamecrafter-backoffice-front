export function validateCronExpression(cron: string): {
  valid: boolean;
  error?: string;
} {
  if (!cron || typeof cron !== "string") {
    return { valid: false, error: "Cron expression is required" };
  }

  const parts = cron.trim().split(/\s+/);

  if (parts.length !== 5) {
    return {
      valid: false,
      error:
        "Cron expression must have exactly 5 fields (minute hour day month weekday)",
    };
  }

  const [minute, hour, day, month, weekday] = parts;

  const minutePattern =
    /^(\*|[0-5]?[0-9](-[0-5]?[0-9])?(\/[0-9]+)?(,([0-5]?[0-9](-[0-5]?[0-9])?(\/[0-9]+)?))*)$/;
  const hourPattern =
    /^(\*|([01]?[0-9]|2[0-3])(-([01]?[0-9]|2[0-3]))?(\/[0-9]+)?(,(([01]?[0-9]|2[0-3])(-([01]?[0-9]|2[0-3]))?(\/[0-9]+)?))*)$/;
  const dayPattern =
    /^(\*|([1-9]|[12][0-9]|3[01])(-([1-9]|[12][0-9]|3[01]))?(\/[0-9]+)?(,(([1-9]|[12][0-9]|3[01])(-([1-9]|[12][0-9]|3[01]))?(\/[0-9]+)?))*)$/;
  const monthPattern =
    /^(\*|([1-9]|1[0-2])(-([1-9]|1[0-2]))?(\/[0-9]+)?(,(([1-9]|1[0-2])(-([1-9]|1[0-2]))?(\/[0-9]+)?))*)$/;
  const weekdayPattern =
    /^(\*|([0-6])(-([0-6]))?(\/[0-9]+)?(,(([0-6])(-([0-6]))?(\/[0-9]+)?))*)$/;

  if (!minutePattern.test(minute)) {
    return { valid: false, error: "Invalid minute field" };
  }

  if (!hourPattern.test(hour)) {
    return { valid: false, error: "Invalid hour field" };
  }

  if (!dayPattern.test(day)) {
    return { valid: false, error: "Invalid day field" };
  }

  if (!monthPattern.test(month)) {
    return { valid: false, error: "Invalid month field" };
  }

  if (!weekdayPattern.test(weekday)) {
    return { valid: false, error: "Invalid weekday field" };
  }

  return { valid: true };
}
