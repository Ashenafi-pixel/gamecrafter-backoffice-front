import React, { useState, useEffect } from "react";
import { X, Edit2, Save, Loader2 } from "lucide-react";
import { wmsService } from "../../services/wmsService";
import { toast } from "react-hot-toast";

interface SweeperConfig {
  enabled: boolean;
  cooldown_hours: number;
  min_profit_usd: number;
  batch_page_size: number;
  cron_expression: string;
  min_eth_balance: string;
  min_sol_balance: string;
  lock_ttl_minutes: number;
  sweep_percentages: {
    btc: number;
    eth: number;
    sol: number;
    usdc: number;
    usdt: number;
  };
  balance_batch_size: number;
  min_eth_for_approval: string;
  gas_estimation_buffer: number;
  idempotency_ttl_hours: number;
  max_concurrent_sweeps: number;
  min_rent_exempt_lamports: number;
  min_btc_balance_threshold: string;
  min_eth_balance_threshold: string;
  min_sol_balance_threshold: string;
  min_usdc_balance_threshold: string;
  min_usdt_balance_threshold: string;
  min_sol_usdc_balance_threshold: string;
  min_sol_usdt_balance_threshold: string;
  native_token_auto_fund_enabled: boolean;
  native_token_auto_fund_daily_limit: number;
  native_token_auto_fund_per_wallet_limit: number;
}

interface SweeperConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CRON_OPTIONS = [
  { label: "Every 30 minutes", value: "*/30 * * * *" },
  { label: "Every 1 hour", value: "0 * * * *" },
  { label: "Every 2 hours", value: "0 */2 * * *" },
  { label: "Every 3 hours", value: "0 */3 * * *" },
  { label: "Every 4 hours", value: "0 */4 * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
  { label: "Every 1 day", value: "0 0 * * *" },
  { label: "Custom", value: "custom" },
];

// Basic cron expression validation
const validateCronExpression = (
  expression: string,
): { valid: boolean; message: string } => {
  if (!expression || expression.trim() === "") {
    return { valid: false, message: "Cron expression cannot be empty" };
  }

  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return {
      valid: false,
      message:
        "Cron expression must have 5 parts (minute hour day month weekday)",
    };
  }

  // Basic validation for each part
  const patterns = [
    /^(\*|\d+|\d+-\d+|\*\/\d+|\d+,\d+)$/, // minute
    /^(\*|\d+|\d+-\d+|\*\/\d+|\d+,\d+)$/, // hour
    /^(\*|\d+|\d+-\d+|\*\/\d+|\d+,\d+)$/, // day
    /^(\*|\d+|\d+-\d+|\*\/\d+|\d+,\d+)$/, // month
    /^(\*|\d+|\d+-\d+|\*\/\d+|\d+,\d+)$/, // weekday
  ];

  for (let i = 0; i < parts.length; i++) {
    if (!patterns[i].test(parts[i])) {
      return {
        valid: false,
        message: `Invalid format in part ${i + 1}: ${parts[i]}`,
      };
    }
  }

  return { valid: true, message: "Valid cron expression" };
};

const getCronDescription = (expression: string): string => {
  const option = CRON_OPTIONS.find((opt) => opt.value === expression);
  if (option && option.value !== "custom") {
    return option.label;
  }
  return `Custom: ${expression}`;
};

interface ExchangeRates {
  [key: string]: {
    crypto_currency: string;
    fiat_currency: string;
    rate: number;
    last_updated: string;
    price_usd: number;
    change_24hr: number;
  };
}

export const SweeperConfigModal: React.FC<SweeperConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState<SweeperConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<SweeperConfig | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [cronInputMode, setCronInputMode] = useState<"dropdown" | "custom">(
    "dropdown",
  );
  const [customCronExpression, setCustomCronExpression] = useState("");
  const [cronValidation, setCronValidation] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      fetchExchangeRates();
    } else {
      // Reset state when modal closes
      setIsEditMode(false);
      setConfig(null);
      setOriginalConfig(null);
      setCronInputMode("dropdown");
      setCustomCronExpression("");
      setCronValidation(null);
      setExchangeRates({});
    }
  }, [isOpen]);

  const fetchExchangeRates = async () => {
    try {
      // Fetch rates for BTC, ETH, SOL, USDC, USDT
      const rates = await wmsService.getExchangeRates({
        currency_codes: "BTC,ETH,SOL,USDC,USDT",
        fiat_currency: "USD",
      });
      setExchangeRates(rates);
    } catch (error: any) {
      console.error("Error fetching exchange rates:", error);
      // Don't show error toast, just log it - rates are optional
    }
  };

  const getUSDValue = (amount: string, currency: string): string | null => {
    if (!amount || !exchangeRates[currency]) return null;
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return null;
    const rate = exchangeRates[currency].price_usd;
    const usdValue = numericAmount * rate;
    return usdValue.toFixed(2);
  };

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const data = await wmsService.getSweeperConfig();
      setConfig(data);
      setOriginalConfig(JSON.parse(JSON.stringify(data))); // Deep copy
      // Check if current cron is in the predefined options
      const cronOption = CRON_OPTIONS.find(
        (opt) => opt.value === data.cron_expression,
      );
      if (cronOption && cronOption.value !== "custom") {
        setCronInputMode("dropdown");
      } else {
        setCronInputMode("custom");
        setCustomCronExpression(data.cron_expression);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to fetch sweeper config",
      );
      console.error("Error fetching sweeper config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = (): boolean => {
    if (!config || !originalConfig) return false;
    return JSON.stringify(config) !== JSON.stringify(originalConfig);
  };

  const handleFieldChange = (field: keyof SweeperConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const handleSweepPercentageChange = (
    currency: keyof SweeperConfig["sweep_percentages"],
    value: number,
  ) => {
    if (!config) return;
    setConfig({
      ...config,
      sweep_percentages: {
        ...config.sweep_percentages,
        [currency]: value,
      },
    });
  };

  const handleCronOptionChange = (value: string) => {
    if (value === "custom") {
      setCronInputMode("custom");
      setCustomCronExpression(config?.cron_expression || "");
      setCronValidation(null);
    } else {
      setCronInputMode("dropdown");
      if (config) {
        setConfig({ ...config, cron_expression: value });
      }
      setCronValidation(null);
    }
  };

  const handleCustomCronChange = (value: string) => {
    setCustomCronExpression(value);
    const validation = validateCronExpression(value);
    setCronValidation(validation);
    if (validation.valid && config) {
      setConfig({ ...config, cron_expression: value });
    }
  };

  const handleSave = async () => {
    if (!config || !originalConfig) return;

    // Validate cron expression if in custom mode
    if (cronInputMode === "custom") {
      const validation = validateCronExpression(customCronExpression);
      if (!validation.valid) {
        toast.error(`Invalid cron expression: ${validation.message}`);
        return;
      }
    }

    const changes: Partial<SweeperConfig> = {};
    const changedFields: string[] = [];

    // Compare all fields
    Object.keys(originalConfig).forEach((key) => {
      const typedKey = key as keyof SweeperConfig;
      if (
        JSON.stringify(originalConfig[typedKey]) !==
        JSON.stringify(config[typedKey])
      ) {
        (changes as any)[typedKey] = config[typedKey];
        changedFields.push(key);
      }
    });

    if (changedFields.length === 0) {
      toast.error("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      await wmsService.updateSweeperConfig(changes);
      toast.success("Sweeper config updated successfully");
      await fetchConfig(); // Refresh to get updated config
      setIsEditMode(false);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update sweeper config",
      );
      console.error("Error updating sweeper config:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isEditMode) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            Sweeper Configuration
          </h2>
          <div className="flex items-center space-x-2">
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : config ? (
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Basic Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Enabled
                    </label>
                    {isEditMode ? (
                      <select
                        value={config.enabled ? "true" : "false"}
                        onChange={(e) =>
                          handleFieldChange(
                            "enabled",
                            e.target.value === "true",
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.enabled ? "Enabled" : "Disabled"}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Cooldown Hours
                    </label>
                    {isEditMode ? (
                      <input
                        type="number"
                        value={config.cooldown_hours}
                        onChange={(e) =>
                          handleFieldChange(
                            "cooldown_hours",
                            parseFloat(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.cooldown_hours}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min Profit USD
                    </label>
                    {isEditMode ? (
                      <input
                        type="number"
                        step="0.01"
                        value={config.min_profit_usd}
                        onChange={(e) =>
                          handleFieldChange(
                            "min_profit_usd",
                            parseFloat(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.min_profit_usd}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Batch Page Size
                    </label>
                    {isEditMode ? (
                      <input
                        type="number"
                        value={config.batch_page_size}
                        onChange={(e) =>
                          handleFieldChange(
                            "batch_page_size",
                            parseInt(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.batch_page_size}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Cron Expression
                    </label>
                    {isEditMode ? (
                      <div className="space-y-2">
                        {cronInputMode === "dropdown" ? (
                          <select
                            value={
                              CRON_OPTIONS.find(
                                (opt) => opt.value === config.cron_expression,
                              )?.value || "custom"
                            }
                            onChange={(e) =>
                              handleCronOptionChange(e.target.value)
                            }
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                          >
                            {CRON_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={customCronExpression}
                              onChange={(e) =>
                                handleCustomCronChange(e.target.value)
                              }
                              placeholder="e.g., 0 */2 * * *"
                              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white ${
                                cronValidation && !cronValidation.valid
                                  ? "border-red-500"
                                  : cronValidation && cronValidation.valid
                                    ? "border-green-500"
                                    : "border-gray-600"
                              }`}
                            />
                            {cronValidation && (
                              <p
                                className={`text-sm ${
                                  cronValidation.valid
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {cronValidation.message}
                              </p>
                            )}
                            <button
                              onClick={() => {
                                setCronInputMode("dropdown");
                                setCronValidation(null);
                              }}
                              className="text-sm text-blue-400 hover:text-blue-300"
                            >
                              Use predefined options
                            </button>
                          </div>
                        )}
                        {cronInputMode === "dropdown" && (
                          <p className="text-sm text-gray-400">
                            Current:{" "}
                            {getCronDescription(config.cron_expression)}
                          </p>
                        )}
                        {cronInputMode === "custom" &&
                          cronValidation?.valid && (
                            <p className="text-sm text-green-400">
                              You are updating the cron expression to:{" "}
                              {customCronExpression}
                            </p>
                          )}
                      </div>
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {getCronDescription(config.cron_expression)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Balance Thresholds */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Balance Thresholds
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min ETH Balance
                    </label>
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          value={config.min_eth_balance}
                          onChange={(e) =>
                            handleFieldChange("min_eth_balance", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                        {getUSDValue(config.min_eth_balance, "ETH") && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ ${getUSDValue(config.min_eth_balance, "ETH")} USD
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                          {config.min_eth_balance}
                        </div>
                        {getUSDValue(config.min_eth_balance, "ETH") && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ ${getUSDValue(config.min_eth_balance, "ETH")} USD
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min SOL Balance
                    </label>
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          value={config.min_sol_balance}
                          onChange={(e) =>
                            handleFieldChange("min_sol_balance", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                        {getUSDValue(config.min_sol_balance, "SOL") && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ ${getUSDValue(config.min_sol_balance, "SOL")} USD
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                          {config.min_sol_balance}
                        </div>
                        {getUSDValue(config.min_sol_balance, "SOL") && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ ${getUSDValue(config.min_sol_balance, "SOL")} USD
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min BTC Balance Threshold
                    </label>
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          value={config.min_btc_balance_threshold}
                          onChange={(e) =>
                            handleFieldChange(
                              "min_btc_balance_threshold",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                        {getUSDValue(
                          config.min_btc_balance_threshold,
                          "BTC",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_btc_balance_threshold,
                              "BTC",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                          {config.min_btc_balance_threshold}
                        </div>
                        {getUSDValue(
                          config.min_btc_balance_threshold,
                          "BTC",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_btc_balance_threshold,
                              "BTC",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min ETH Balance Threshold
                    </label>
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          value={config.min_eth_balance_threshold}
                          onChange={(e) =>
                            handleFieldChange(
                              "min_eth_balance_threshold",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                        {getUSDValue(
                          config.min_eth_balance_threshold,
                          "ETH",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_eth_balance_threshold,
                              "ETH",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                          {config.min_eth_balance_threshold}
                        </div>
                        {getUSDValue(
                          config.min_eth_balance_threshold,
                          "ETH",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_eth_balance_threshold,
                              "ETH",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min SOL Balance Threshold
                    </label>
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          value={config.min_sol_balance_threshold}
                          onChange={(e) =>
                            handleFieldChange(
                              "min_sol_balance_threshold",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                        {getUSDValue(
                          config.min_sol_balance_threshold,
                          "SOL",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_sol_balance_threshold,
                              "SOL",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                          {config.min_sol_balance_threshold}
                        </div>
                        {getUSDValue(
                          config.min_sol_balance_threshold,
                          "SOL",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_sol_balance_threshold,
                              "SOL",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min USDC Balance Threshold
                    </label>
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          value={config.min_usdc_balance_threshold}
                          onChange={(e) =>
                            handleFieldChange(
                              "min_usdc_balance_threshold",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                        {getUSDValue(
                          config.min_usdc_balance_threshold,
                          "USDC",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_usdc_balance_threshold,
                              "USDC",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                          {config.min_usdc_balance_threshold}
                        </div>
                        {getUSDValue(
                          config.min_usdc_balance_threshold,
                          "USDC",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_usdc_balance_threshold,
                              "USDC",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min USDT Balance Threshold
                    </label>
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          value={config.min_usdt_balance_threshold}
                          onChange={(e) =>
                            handleFieldChange(
                              "min_usdt_balance_threshold",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                        {getUSDValue(
                          config.min_usdt_balance_threshold,
                          "USDT",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_usdt_balance_threshold,
                              "USDT",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                          {config.min_usdt_balance_threshold}
                        </div>
                        {getUSDValue(
                          config.min_usdt_balance_threshold,
                          "USDT",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_usdt_balance_threshold,
                              "USDT",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min SOL USDC Balance Threshold
                    </label>
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          value={config.min_sol_usdc_balance_threshold}
                          onChange={(e) =>
                            handleFieldChange(
                              "min_sol_usdc_balance_threshold",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                        {getUSDValue(
                          config.min_sol_usdc_balance_threshold,
                          "USDC",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_sol_usdc_balance_threshold,
                              "USDC",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                          {config.min_sol_usdc_balance_threshold}
                        </div>
                        {getUSDValue(
                          config.min_sol_usdc_balance_threshold,
                          "USDC",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_sol_usdc_balance_threshold,
                              "USDC",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min SOL USDT Balance Threshold
                    </label>
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          value={config.min_sol_usdt_balance_threshold}
                          onChange={(e) =>
                            handleFieldChange(
                              "min_sol_usdt_balance_threshold",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                        {getUSDValue(
                          config.min_sol_usdt_balance_threshold,
                          "USDT",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_sol_usdt_balance_threshold,
                              "USDT",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                          {config.min_sol_usdt_balance_threshold}
                        </div>
                        {getUSDValue(
                          config.min_sol_usdt_balance_threshold,
                          "USDT",
                        ) && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ $
                            {getUSDValue(
                              config.min_sol_usdt_balance_threshold,
                              "USDT",
                            )}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sweep Percentages */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Sweep Percentages
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(config.sweep_percentages).map(
                    ([currency, percentage]) => (
                      <div key={currency}>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          {currency.toUpperCase()} (%)
                        </label>
                        {isEditMode ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={percentage}
                            onChange={(e) =>
                              handleSweepPercentageChange(
                                currency as keyof SweeperConfig["sweep_percentages"],
                                parseInt(e.target.value),
                              )
                            }
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                          />
                        ) : (
                          <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                            {percentage}%
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Advanced Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Lock TTL Minutes
                    </label>
                    {isEditMode ? (
                      <input
                        type="number"
                        value={config.lock_ttl_minutes}
                        onChange={(e) =>
                          handleFieldChange(
                            "lock_ttl_minutes",
                            parseInt(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.lock_ttl_minutes}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Balance Batch Size
                    </label>
                    {isEditMode ? (
                      <input
                        type="number"
                        value={config.balance_batch_size}
                        onChange={(e) =>
                          handleFieldChange(
                            "balance_batch_size",
                            parseInt(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.balance_batch_size}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min ETH for Approval
                    </label>
                    {isEditMode ? (
                      <div>
                        <input
                          type="text"
                          value={config.min_eth_for_approval}
                          onChange={(e) =>
                            handleFieldChange(
                              "min_eth_for_approval",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                        {getUSDValue(config.min_eth_for_approval, "ETH") && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ ${getUSDValue(config.min_eth_for_approval, "ETH")}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                          {config.min_eth_for_approval}
                        </div>
                        {getUSDValue(config.min_eth_for_approval, "ETH") && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ ${getUSDValue(config.min_eth_for_approval, "ETH")}{" "}
                            USD
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Gas Estimation Buffer
                    </label>
                    {isEditMode ? (
                      <input
                        type="number"
                        step="0.1"
                        value={config.gas_estimation_buffer}
                        onChange={(e) =>
                          handleFieldChange(
                            "gas_estimation_buffer",
                            parseFloat(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.gas_estimation_buffer}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Idempotency TTL Hours
                    </label>
                    {isEditMode ? (
                      <input
                        type="number"
                        value={config.idempotency_ttl_hours}
                        onChange={(e) =>
                          handleFieldChange(
                            "idempotency_ttl_hours",
                            parseInt(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.idempotency_ttl_hours}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Max Concurrent Sweeps
                    </label>
                    {isEditMode ? (
                      <input
                        type="number"
                        value={config.max_concurrent_sweeps}
                        onChange={(e) =>
                          handleFieldChange(
                            "max_concurrent_sweeps",
                            parseInt(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.max_concurrent_sweeps}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Min Rent Exempt Lamports
                    </label>
                    {isEditMode ? (
                      <input
                        type="number"
                        value={config.min_rent_exempt_lamports}
                        onChange={(e) =>
                          handleFieldChange(
                            "min_rent_exempt_lamports",
                            parseInt(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.min_rent_exempt_lamports}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Native Token Auto Fund */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Native Token Auto Fund
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Enabled
                    </label>
                    {isEditMode ? (
                      <select
                        value={
                          config.native_token_auto_fund_enabled
                            ? "true"
                            : "false"
                        }
                        onChange={(e) =>
                          handleFieldChange(
                            "native_token_auto_fund_enabled",
                            e.target.value === "true",
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.native_token_auto_fund_enabled
                          ? "Enabled"
                          : "Disabled"}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Daily Limit
                    </label>
                    {isEditMode ? (
                      <input
                        type="number"
                        step="0.01"
                        value={config.native_token_auto_fund_daily_limit}
                        onChange={(e) =>
                          handleFieldChange(
                            "native_token_auto_fund_daily_limit",
                            parseFloat(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.native_token_auto_fund_daily_limit}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Per Wallet Limit
                    </label>
                    {isEditMode ? (
                      <input
                        type="number"
                        step="0.01"
                        value={config.native_token_auto_fund_per_wallet_limit}
                        onChange={(e) =>
                          handleFieldChange(
                            "native_token_auto_fund_per_wallet_limit",
                            parseFloat(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-white">
                        {config.native_token_auto_fund_per_wallet_limit}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No configuration data available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-6 flex justify-end space-x-3">
          {isEditMode && (
            <>
              <button
                onClick={() => {
                  setIsEditMode(false);
                  if (config && originalConfig) {
                    setConfig(JSON.parse(JSON.stringify(originalConfig))); // Reset to original
                    const cronOption = CRON_OPTIONS.find(
                      (opt) => opt.value === originalConfig.cron_expression,
                    );
                    if (cronOption && cronOption.value !== "custom") {
                      setCronInputMode("dropdown");
                    } else {
                      setCronInputMode("custom");
                      setCustomCronExpression(originalConfig.cron_expression);
                    }
                    setCronValidation(null);
                  }
                }}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  isSaving ||
                  !hasChanges() ||
                  (cronInputMode === "custom" &&
                    (!cronValidation || !cronValidation.valid))
                }
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2 transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </>
          )}
          {!isEditMode && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
