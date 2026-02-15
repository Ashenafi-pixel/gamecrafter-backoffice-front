/**
 * Utility functions for handling number inputs to prevent "0" from appearing
 * when the field is empty or should be empty
 */

/**
 * Formats a number value for display in an input field
 * Returns empty string if value is 0 or falsy, otherwise returns the value
 */
export const formatNumberInputValue = (
  value: number | string | null | undefined,
): string => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === 0 ||
    value === "0"
  ) {
    return "";
  }
  return String(value);
};

/**
 * Parses a number input value, handling empty strings and converting to number
 */
export const parseNumberInputValue = (value: string): number => {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Handles onChange for number inputs to prevent "0" from appearing
 */
export const handleNumberInputChange = (
  value: string,
  setter: (value: number | string) => void,
  allowEmpty: boolean = true,
) => {
  if (value === "" && allowEmpty) {
    setter("");
    return;
  }
  const parsed = parseFloat(value);
  if (!isNaN(parsed)) {
    setter(parsed);
  } else if (allowEmpty) {
    setter("");
  }
};
