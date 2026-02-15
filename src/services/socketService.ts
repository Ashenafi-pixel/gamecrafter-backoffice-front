import { config } from "../config/load-config";

interface WebSocketServiceConfig {
  baseUrl: string;
  protocols?: string | string[];
}

interface WebSocketMessage {
  type: string;
  deposit?: DepositSession;
  withdrawal?: Withdrawal;
  balance?: Balance;
}

type Crypto = "USDC" | "USDT" | "SOL" | "ETH" | "BTC";
type Network = "ERC-20" | "SOL" | "BTC" | "TRC-20";
type ChainID =
  | "eth-mainnet"
  | "eth-testnet"
  | "btc-mainnet"
  | "btc-testnet"
  | "sol-mainnet"
  | "sol-testnet"
  | "tron-mainnet";

interface DepositSession {
  id: string;
  session_id: string;
  chain_id: ChainID;
  user_id: string;
  network: Network;
  wallet_address?: string;
  amount: number;
  crypto_currency: Crypto;
  status:
    | "pending"
    | "completed"
    | "processing"
    | "cancelled"
    | "failed"
    | "expired";
  qr_code_data?: string;
  payment_link?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

interface Withdrawal {
  id: string;
  withdrawal_id: string;
  chain_id: ChainID;
  user_id: string;
  network: Network;
  wallet_address: string;
  crypto_amount: string;
  crypto_currency: Crypto;
  status: "pending" | "verified" | "failed" | "processing";
  created_at: string;
  updated_at: string;
}

interface Balance {
  id: string;
  user_id: string;
  currency_code: string;
  amount_cents: number;
  amount_units: string;
  reserved_cents: number;
  reserved_units: string;
  updated_at: string;
}

interface WebSocketError {
  message: string;
  code?: number;
}

type MessageHandler = (message: WebSocketMessage) => void;
type ErrorHandler = (error: WebSocketError) => void;
type OpenHandler = () => void;
type CloseHandler = (code: number, reason: string) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private readonly baseUrl: string;
  private readonly protocols: string | string[] | undefined;
  private readonly ACCESS_TOKEN_KEY = "access_token";
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private errorHandler: ErrorHandler | null = null;
  private openHandler: OpenHandler | null = null;
  private closeHandler: CloseHandler | null = null;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = Infinity;
  private readonly initialReconnectDelay: number = 1000;
  private readonly maxReconnectDelay: number = 30000;
  private intentionalDisconnect: boolean = false;
  private pingInterval: number = 30000;
  private pongTimeoutDuration: number = 10000;
  private pingTimer: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;

  constructor(config: WebSocketServiceConfig) {
    this.baseUrl = config.baseUrl;
    this.protocols = config.protocols;
  }

  private getWebSocketUrl(): string {
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    const url = new URL(config.tvsWebSocketUrl);
    if (token) {
      url.searchParams.append("token", token);
    }
    return url.toString();
  }

  connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      this.ws = new WebSocket(this.getWebSocketUrl(), this.protocols);
      this.setupEventListeners();
    } catch (error: any) {
      this.handleError({ message: error.message });
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startPing();
      if (this.openHandler) this.openHandler();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        if (message.type === "pong") {
          if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
          }
          return;
        }

        switch (message.type) {
          case "deposit": {
            if (this.messageHandlers.has("deposit")) {
              this.messageHandlers.get("deposit")!(message);
            }
            break;
          }
          case "withdrawal": {
            if (this.messageHandlers.has("withdrawal")) {
              this.messageHandlers.get("withdrawal")!(message);
            }
            break;
          }
          case "balance": {
            if (this.messageHandlers.has("balance")) {
              this.messageHandlers.get("balance")!(message);
            }
            break;
          }
          default: {
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
              handler(message);
            }
          }
        }
      } catch (error: any) {
        this.handleError({
          message: `Failed to parse message: ${error.message}`,
        });
      }
    };

    this.ws.onerror = (event: Event) => {
      this.handleError({ message: "WebSocket error occurred" });
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.clearTimers();
      if (this.closeHandler) {
        this.closeHandler(event.code, event.reason);
      }
      if (this.intentionalDisconnect) {
        this.intentionalDisconnect = false;
        return;
      }
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay =
          Math.min(
            this.initialReconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay,
          ) +
          Math.random() * 1000;
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, delay);
      }
    };
  }

  private startPing(): void {
    this.clearTimers();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
        this.pongTimeout = setTimeout(() => {
          if (this.ws) {
            this.intentionalDisconnect = false;
            this.ws.close(1002, "Pong timeout");
          }
        }, this.pongTimeoutDuration);
      }
    }, this.pingInterval);
  }

  private clearTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private handleError(error: WebSocketError): void {
    if (this.errorHandler) {
      this.errorHandler(error);
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error("WebSocket is not connected");
    }
  }

  onDeposit(
    handler: (message: WebSocketMessage & { deposit: DepositSession }) => void,
  ): void {
    this.messageHandlers.set("deposit", handler as MessageHandler);
  }

  onWithdrawal(
    handler: (message: WebSocketMessage & { withdrawal: Withdrawal }) => void,
  ): void {
    this.messageHandlers.set("withdrawal", handler as MessageHandler);
  }

  onBalance(
    handler: (message: WebSocketMessage & { balance: Balance }) => void,
  ): void {
    this.messageHandlers.set("balance", handler as MessageHandler);
  }

  onMessage(type: string, handler: MessageHandler): void {
    this.messageHandlers.set(type, handler);
  }

  onError(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  onOpen(handler: OpenHandler): void {
    this.openHandler = handler;
  }

  onClose(handler: CloseHandler): void {
    this.closeHandler = handler;
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close(1000, "Client initiated disconnect");
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  createDepositMessage(deposit: DepositSession): WebSocketMessage {
    return {
      type: "deposit",
      deposit,
    };
  }

  createWithdrawalMessage(withdrawal: Withdrawal): WebSocketMessage {
    return {
      type: "withdrawal",
      withdrawal,
    };
  }

  createBalanceMessage(balance: Balance): WebSocketMessage {
    return {
      type: "balance",
      balance,
    };
  }
}

export const createWebSocketService = (
  baseUrl: string,
  protocols?: string | string[],
): WebSocketService => {
  return new WebSocketService({ baseUrl, protocols });
};

export const tvsWebSocket = createWebSocketService(config.tvsWebSocketUrl);
