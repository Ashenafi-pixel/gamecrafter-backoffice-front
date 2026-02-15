export const decodeJWT = (token: string): any | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT token format');
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
    return null;
  }
};

export const getTokenExpiration = (token: string): number | null => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  return decoded.exp;
};

export const getSecondsUntilExpiration = (token: string): number | null => {
  const exp = getTokenExpiration(token);
  if (!exp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const secondsUntilExp = exp - now;

  return secondsUntilExp > 0 ? secondsUntilExp : 0;
};
