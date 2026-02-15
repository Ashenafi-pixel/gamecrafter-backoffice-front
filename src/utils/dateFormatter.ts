export function formatGameImportDate(
  dateString: string | null,
  prefix: string,
): string | null {
  if (!dateString) {
    return null;
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }

    const datePart = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const timePart = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${prefix} ${datePart} at ${timePart}`;
  } catch {
    return null;
  }
}
