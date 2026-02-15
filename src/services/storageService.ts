import Cookies from "js-cookie";

interface StorageConfig {
  cookiePath?: string;
  cookieSecure?: boolean;
  cookieSameSite?: "strict" | "lax" | "none";
}

export class StorageService {
  private readonly ACCESS_TOKEN_KEY = "access_token";
  private readonly REFRESH_TOKEN_KEY = "refresh_token";
  private readonly REMEMBER_ME_KEY = "remember_me";
  private config: StorageConfig;

  constructor(config: StorageConfig = {}) {
    this.config = {
      cookiePath: "/",
      cookieSecure: true,
      cookieSameSite: "lax",
      ...config,
    };
  }

  // LocalStorage methods
  setLocalStorageItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`StorageService: Failed to set ${key}:`, error);
    }
  }

  getLocalStorageItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  removeLocalStorageItem(key: string): void {
    localStorage.removeItem(key);
  }

  // Cookie methods
  setCookie(key: string, value: string, expires?: number | Date): void {
    Cookies.set(key, value, {
      expires,
      path: this.config.cookiePath,
      secure: this.config.cookieSecure,
      sameSite: this.config.cookieSameSite,
    });
  }

  getCookie(key: string): string | undefined {
    return Cookies.get(key);
  }

  removeCookie(key: string): void {
    Cookies.remove(key, { path: this.config.cookiePath });
  }

  setAuthTokens(
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean,
  ): void {
    this.setLocalStorageItem(this.ACCESS_TOKEN_KEY, accessToken);
    if (rememberMe) {
      // Set cookies with 7-day expiration for refresh token
      this.setCookie(this.REFRESH_TOKEN_KEY, refreshToken, 7);
      this.setCookie(this.REMEMBER_ME_KEY, "true", 7);
    } else {
      // Session-only storage
      this.setLocalStorageItem(this.REFRESH_TOKEN_KEY, refreshToken);
      this.setLocalStorageItem(this.REMEMBER_ME_KEY, "false");
    }
  }

  getAccessToken(): string | null {
    return this.getLocalStorageItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | undefined {
    const rememberMe =
      this.getLocalStorageItem(this.REMEMBER_ME_KEY) === "true";

    return rememberMe
      ? this.getCookie(this.REFRESH_TOKEN_KEY)
      : (this.getLocalStorageItem(this.REFRESH_TOKEN_KEY) ?? undefined);
  }

  isRememberMe(): boolean {
    return this.getLocalStorageItem(this.REMEMBER_ME_KEY) === "true";
  }

  clearAuthTokens(): void {
    this.removeLocalStorageItem(this.ACCESS_TOKEN_KEY);
    this.removeLocalStorageItem(this.REMEMBER_ME_KEY);
    this.removeLocalStorageItem(this.REFRESH_TOKEN_KEY);
    this.removeCookie(this.REFRESH_TOKEN_KEY);
    this.removeCookie(this.REMEMBER_ME_KEY);
  }
}

export const storageService = new StorageService();
