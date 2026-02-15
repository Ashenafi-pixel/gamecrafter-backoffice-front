interface AppConfig {
  walletApiUrl: string;
  tvsWebSocketUrl: string;
  adminApiUrl: string;
  clientBaseUrl: string;
  apiTimeout?: number;
  environment: string;
}

const loadConfig = (): AppConfig => {
  // Get environment variables with fallbacks
  const environment = import.meta.env.VITE_APP_ENV!;
  const adminApiUrl = import.meta.env.VITE_ADMIN_API_URL!;
  const walletApiUrl = import.meta.env.VITE_WALLET_API_URL!;
  const tvsWebSocketUrl = import.meta.env.VITE_TVS_WEBSOCKET_URL!;
  const clientBaseUrl = import.meta.env.VITE_CLIENT_BASE_URL || "";
  const apiTimeout = Number(import.meta.env.VITE_API_TIMEOUT!);

  // Validate that clientBaseUrl is set and is an absolute URL
  if (!clientBaseUrl || clientBaseUrl.trim() === "") {
    console.error(
      "❌ VITE_CLIENT_BASE_URL is not set! Analytics requests will fail.",
    );
    console.error(
      "Please set VITE_CLIENT_BASE_URL in your environment variables.",
    );
  } else if (
    !clientBaseUrl.startsWith("http://") &&
    !clientBaseUrl.startsWith("https://")
  ) {
    console.error(
      "❌ VITE_CLIENT_BASE_URL must be an absolute URL (starting with http:// or https://)",
    );
    console.error("Current value:", clientBaseUrl);
  }

  console.log("Environment Configuration:", {
    environment,
    adminApiUrl,
    walletApiUrl,
    tvsWebSocketUrl,
    clientBaseUrl: clientBaseUrl || "(NOT SET - REQUIRED)",
    apiTimeout,
  });

  return {
    environment,
    walletApiUrl,
    tvsWebSocketUrl,
    adminApiUrl,
    clientBaseUrl: clientBaseUrl || "http://localhost:8094",
    apiTimeout,
  };
};

export const config = loadConfig();
