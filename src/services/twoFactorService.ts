import { adminSvc } from "./apiService";

// 2FA Types
export interface TwoFactorAuthSetupResponse {
  secret: string;
  qr_code_data: string; // otpauth URL for QR code generation
  recovery_codes?: string[];
}

export interface TwoFactorSettings {
  user_id: string;
  is_enabled: boolean;
  enabled_at?: string;
}

export interface TwoFactorResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface TwoFactorSetupRequest {
  secret: string;
  token: string;
}

export interface TwoFactorVerifyRequest {
  token: string;
  backup_code?: string;
}

export interface TwoFactorDisableRequest {
  token: string;
}

// Multi-method types
export interface TwoFactorMethodInfo {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface EnableMethodRequest {
  method: string;
  data?: any;
}

export interface DisableMethodRequest {
  method: string;
  verification_data: string;
}

export interface VerifyWithMethodRequest {
  method: string;
  token: string;
}

export interface GenerateOTPRequest {
  email?: string;
  phone_number?: string;
}

export interface BackupCodesResponse {
  backup_codes: string[];
  warning: string;
}

export interface TwoFactorStatus {
  is_enabled: boolean;
  is_setup_complete: boolean;
  has_backup_codes: boolean;
}

class TwoFactorService {
  private basePath = "/auth/2fa";

  /**
   * Generate a new 2FA secret and QR code
   */
  async generateSecret(email: string): Promise<TwoFactorAuthSetupResponse> {
    const response = await adminSvc.post<TwoFactorAuthSetupResponse>(
      `${this.basePath}/generate-secret`,
      { email },
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to generate 2FA secret");
    }

    return response.data!;
  }

  /**
   * Enable 2FA with token verification
   */
  async enable2FA(request: TwoFactorSetupRequest): Promise<void> {
    const response = await adminSvc.post<TwoFactorResponse>(
      `${this.basePath}/enable`,
      request,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to enable 2FA");
    }
  }

  /**
   * Get current 2FA status
   */
  async getStatus(): Promise<TwoFactorSettings> {
    const response = await adminSvc.get<TwoFactorSettings>(
      `${this.basePath}/status`,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to get 2FA status");
    }

    return response.data!;
  }

  /**
   * Disable 2FA
   */
  async disable2FA(request: TwoFactorDisableRequest): Promise<void> {
    const response = await adminSvc.post<TwoFactorResponse>(
      `${this.basePath}/disable`,
      request,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to disable 2FA");
    }
  }

  /**
   * Verify 2FA token (used during login)
   */
  async verifyToken(request: TwoFactorVerifyRequest): Promise<void> {
    const response = await adminSvc.post<TwoFactorResponse>(
      `${this.basePath}/verify`,
      request,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to verify 2FA token");
    }
  }

  /**
   * Generate QR code data URI for authenticator apps
   */
  generateQRCodeDataURI(
    secret: string,
    email: string,
    issuer: string = "TucanBIT",
  ): string {
    const encodedSecret = encodeURIComponent(secret);
    const encodedEmail = encodeURIComponent(email);
    const encodedIssuer = encodeURIComponent(issuer);

    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${encodedSecret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Generate backup codes (this would typically be done on the backend)
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Validate TOTP token format
   */
  isValidTOTPFormat(token: string): boolean {
    return /^\d{6}$/.test(token);
  }

  /**
   * Validate backup code format
   */
  isValidBackupCodeFormat(code: string): boolean {
    return /^[A-Z0-9]{8}$/.test(code);
  }

  // Multi-method methods
  /**
   * Get available 2FA methods for a user
   */
  async getAvailableMethods(userId?: string): Promise<string[]> {
    const url = userId
      ? `${this.basePath}/available-methods?user_id=${userId}`
      : `${this.basePath}/methods/available-methods`;

    const response = await adminSvc.get<string[]>(url);

    if (!response.success) {
      throw new Error(response.message || "Failed to get available methods");
    }

    return response.data!;
  }

  /**
   * Enable a specific 2FA method
   */
  async enableMethod(
    request: EnableMethodRequest,
    userId?: string,
  ): Promise<void> {
    const requestBody = userId ? { ...request, user_id: userId } : request;

    const response = await adminSvc.post<TwoFactorResponse>(
      `${this.basePath}/methods/enable`,
      requestBody,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to enable method");
    }
  }

  /**
   * Disable a specific 2FA method
   */
  async disableMethod(
    request: DisableMethodRequest,
    userId?: string,
  ): Promise<void> {
    const requestBody = userId ? { ...request, user_id: userId } : request;

    const response = await adminSvc.post<TwoFactorResponse>(
      `${this.basePath}/methods/disable`,
      requestBody,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to disable method");
    }
  }

  /**
   * Verify login with a specific method
   */
  async verifyWithMethod(request: VerifyWithMethodRequest): Promise<void> {
    const response = await adminSvc.post<TwoFactorResponse>(
      `${this.basePath}/verify-method`,
      request,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to verify with method");
    }
  }

  /**
   * Generate email OTP
   */
  async generateEmailOTP(request: GenerateOTPRequest): Promise<void> {
    const response = await adminSvc.post<TwoFactorResponse>(
      `${this.basePath}/methods/email-otp`,
      request,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to generate email OTP");
    }
  }

  /**
   * Generate SMS OTP
   */
  async generateSmsOTP(request: GenerateOTPRequest): Promise<void> {
    const response = await adminSvc.post<TwoFactorResponse>(
      `${this.basePath}/methods/sms-otp`,
      request,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to generate SMS OTP");
    }
  }

  /**
   * Generate TOTP secret for setup during login
   */
  async generateSecretForSetup(
    userId: string,
  ): Promise<TwoFactorAuthSetupResponse> {
    const response = await adminSvc.post<TwoFactorAuthSetupResponse>(
      `${this.basePath}/setup/generate-secret`,
      { user_id: userId },
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to generate 2FA secret");
    }

    return response.data!;
  }

  /**
   * Enable TOTP method
   */
  async enableTOTP(userId: string, token: string): Promise<any> {
    const response = await adminSvc.post<any>(
      `${this.basePath}/setup/enable-totp`,
      { user_id: userId, token },
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to enable TOTP");
    }

    return response.data!;
  }

  /**
   * Enable Email OTP method
   */
  async enableEmailOTP(userId: string, token: string): Promise<any> {
    const response = await adminSvc.post<any>(
      `${this.basePath}/setup/enable-email-otp`,
      { user_id: userId, token },
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to enable Email OTP");
    }

    return response.data!;
  }

  /**
   * Enable SMS OTP method
   */
  async enableSMSOTP(userId: string, token: string): Promise<any> {
    const response = await adminSvc.post<any>(
      `${this.basePath}/setup/enable-sms-otp`,
      { user_id: userId, token },
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to enable SMS OTP");
    }

    return response.data!;
  }

  /**
   * Generate SMS OTP for setup
   */
  async generateSMSOTP(userId: string): Promise<void> {
    const response = await adminSvc.post<TwoFactorResponse>(
      `${this.basePath}/generate-sms-otp`,
      { user_id: userId },
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to generate SMS OTP");
    }
  }

  // Passkey methods
  /**
   * Register a new passkey credential
   */
  async registerPasskey(request: {
    credential: any;
    user_id: string;
  }): Promise<TwoFactorResponse> {
    const response = await adminSvc.post<TwoFactorResponse>(
      `${this.basePath}/passkey/register`,
      request,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to register passkey");
    }

    return response;
  }

  /**
   * Get passkey assertion options for verification
   */
  async getPasskeyAssertionOptions(request: {
    user_id: string;
  }): Promise<TwoFactorResponse> {
    const response = await adminSvc.post<TwoFactorResponse>(
      `${this.basePath}/passkey/assertion-options`,
      request,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to get assertion options");
    }

    return response;
  }

  /**
   * Verify passkey credential
   */
  async verifyPasskey(request: {
    credential: any;
    user_id: string;
  }): Promise<TwoFactorResponse> {
    const response = await adminSvc.post<TwoFactorResponse>(
      `${this.basePath}/passkey/verify`,
      request,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to verify passkey");
    }

    return response;
  }

  /**
   * List user's passkey credentials
   */
  async listPasskeys(userId: string): Promise<TwoFactorResponse> {
    const response = await adminSvc.get<TwoFactorResponse>(
      `${this.basePath}/passkey/list?user_id=${userId}`,
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to list passkeys");
    }

    return response;
  }

  /**
   * Delete a passkey credential
   */
  async deletePasskey(
    credentialId: string,
    userId: string,
  ): Promise<TwoFactorResponse> {
    const response = await adminSvc.delete<TwoFactorResponse>(
      `${this.basePath}/passkey/delete`,
      { credential_id: credentialId, user_id: userId },
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to delete passkey");
    }

    return response;
  }
}

export const twoFactorService = new TwoFactorService();
