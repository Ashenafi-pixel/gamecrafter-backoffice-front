import React, { useState, useEffect } from "react";
import { Pause, DollarSign, Shield, Save, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { wmsService } from "../../services/wmsService";
import { brandService, Brand } from "../../services/brandService";
import toast from "react-hot-toast";

interface WithdrawalGlobalStatus {
  enabled: boolean;
  reason: string;
  paused_at: string;
  paused_by: string;
}

interface WithdrawalThreshold {
  value: number;
  currency: string;
  enabled: boolean;
}

interface WithdrawalThresholds {
  hourly_volume: WithdrawalThreshold;
  daily_volume: WithdrawalThreshold;
  single_transaction: WithdrawalThreshold;
}

interface WithdrawalManualReview {
  enabled: boolean;
  single_threshold_cents: number;
  daily_threshold_cents: number;
}

// Backend response interfaces
interface CumulativeKYCTransactionLimit {
  usd_amount_cents: number;
  enabled: boolean;
}

interface KYCThreshold {
  usd_amount_cents: number;
  enabled: boolean;
}

interface WithdrawalThresholdsResponse {
  cumulative_kyc_transaction_limit?: CumulativeKYCTransactionLimit;
  kyc_threshold?: KYCThreshold;
  withdrawal_manual_review?: WithdrawalManualReview;
}

interface WithdrawalLimit {
  chain_id: string;
  max_amount_cents: number;
  min_amount_cents: number;
}

interface ChainConfig {
  chain_id: string;
  name?: string;
  is_testnet?: boolean;
}

const WithdrawalSettings: React.FC = () => {
  const useTestnets = false;
  const [searchParams] = useSearchParams();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [globalStatus, setGlobalStatus] = useState<WithdrawalGlobalStatus>({
    enabled: true,
    reason: "",
    paused_by: "",
    paused_at: "",
  });
  const [thresholds, setThresholds] = useState<WithdrawalThresholds>({
    hourly_volume: { value: 0, currency: "USD", enabled: false },
    daily_volume: { value: 0, currency: "USD", enabled: false },
    single_transaction: { value: 0, currency: "USD", enabled: false },
  });
  const [manualReview, setManualReview] = useState<WithdrawalManualReview>({
    enabled: false,
    single_threshold_cents: 0,
    daily_threshold_cents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [savingGlobalStatus, setSavingGlobalStatus] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [savingManualReview, setSavingManualReview] = useState(false);
  const [requireKYCOnFirstWithdrawal, setRequireKYCOnFirstWithdrawal] =
    useState(false);
  const [
    originalRequireKYCOnFirstWithdrawal,
    setOriginalRequireKYCOnFirstWithdrawal,
  ] = useState(false);
  const [savingKYCOnFirstWithdrawal, setSavingKYCOnFirstWithdrawal] =
    useState(false);
  const [depositMarginPercent, setDepositMarginPercent] = useState(0);
  const [originalDepositMarginPercent, setOriginalDepositMarginPercent] =
    useState(0);
  const [savingDepositMargin, setSavingDepositMargin] = useState(false);
  const [withdrawalMarginPercent, setWithdrawalMarginPercent] = useState(0);
  const [originalWithdrawalMarginPercent, setOriginalWithdrawalMarginPercent] =
    useState(0);
  const [savingWithdrawalMargin, setSavingWithdrawalMargin] = useState(false);
  const [duplicateAccountChecksEnabled, setDuplicateAccountChecksEnabled] =
    useState(false);
  const [
    originalDuplicateAccountChecksEnabled,
    setOriginalDuplicateAccountChecksEnabled,
  ] = useState(false);
  const [savingDuplicateAccountChecks, setSavingDuplicateAccountChecks] =
    useState(false);

  // Original state for change detection
  const [originalGlobalStatus, setOriginalGlobalStatus] =
    useState<WithdrawalGlobalStatus>({
      enabled: true,
      reason: "",
      paused_by: "",
      paused_at: "",
    });
  const [originalThresholds, setOriginalThresholds] =
    useState<WithdrawalThresholds>({
      hourly_volume: { value: 0, currency: "USD", enabled: false },
      daily_volume: { value: 0, currency: "USD", enabled: false },
      single_transaction: { value: 0, currency: "USD", enabled: false },
    });
  const [originalManualReview, setOriginalManualReview] =
    useState<WithdrawalManualReview>({
      enabled: false,
      single_threshold_cents: 0,
      daily_threshold_cents: 0,
    });

  // Withdrawal Limits state
  const [chains, setChains] = useState<ChainConfig[]>([]);
  const [withdrawalLimits, setWithdrawalLimits] = useState<
    Record<string, WithdrawalLimit>
  >({});
  const [originalWithdrawalLimits, setOriginalWithdrawalLimits] = useState<
    Record<string, WithdrawalLimit>
  >({});
  const [savingLimits, setSavingLimits] = useState<Record<string, boolean>>({});
  const [loadingLimits, setLoadingLimits] = useState(false);
  const [limitErrors, setLimitErrors] = useState<
    Record<string, { min?: string; max?: string }>
  >({});
  const [validationEnabled, setValidationEnabled] = useState(false);
  const [savingValidationToggle, setSavingValidationToggle] = useState(false);
  const [globalLimits, setGlobalLimits] = useState({
    min_amount_cents: 0,
    max_amount_cents: 0,
    enabled: false,
  });
  const [originalGlobalLimits, setOriginalGlobalLimits] = useState({
    min_amount_cents: 0,
    max_amount_cents: 0,
    enabled: false,
  });
  const [savingGlobalLimits, setSavingGlobalLimits] = useState(false);
  const [globalLimitsErrors, setGlobalLimitsErrors] = useState<{
    min?: string;
    max?: string;
  }>({});

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId !== null) {
      fetchSettings();
    }
  }, [selectedBrandId]);

  const fetchBrands = async () => {
    try {
      setLoadingBrands(true);
      const response = await brandService.getBrands({
        page: 1,
        "per-page": 100,
      });
      if (response.success && response.data) {
        const brandsList = response.data.brands || [];
        setBrands(brandsList);

        // Check query params first (highest priority)
        const brandIdFromQuery = searchParams.get("brand_id");
        if (
          brandIdFromQuery &&
          brandsList.some((b: Brand) => b.id === brandIdFromQuery)
        ) {
          setSelectedBrandId(brandIdFromQuery);
          localStorage.setItem(
            "withdrawal_settings_brand_id",
            brandIdFromQuery,
          );
        } else {
          // If no brand_id in query, check localStorage
          const storedBrandId = localStorage.getItem(
            "withdrawal_settings_brand_id",
          );
          if (
            storedBrandId &&
            brandsList.some((b: Brand) => b.id === storedBrandId)
          ) {
            setSelectedBrandId(storedBrandId);
          } else if (brandsList.length > 0) {
            // If neither exists, randomly select a brand
            const randomIndex = Math.floor(Math.random() * brandsList.length);
            const randomBrand = brandsList[randomIndex];
            setSelectedBrandId(randomBrand.id);
            localStorage.setItem(
              "withdrawal_settings_brand_id",
              randomBrand.id,
            );
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching brands:", err);
      toast.error("Failed to fetch brands");
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    localStorage.setItem("withdrawal_settings_brand_id", brandId);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);

      const globalStatusData = await wmsService.getWithdrawalGlobalStatus(
        selectedBrandId || undefined,
      );
      if (globalStatusData) {
        setGlobalStatus(globalStatusData);
        setOriginalGlobalStatus(JSON.parse(JSON.stringify(globalStatusData)));
      }

      const thresholdsData = await wmsService.getWithdrawalThresholds(
        selectedBrandId || undefined,
      );
      if (thresholdsData) {
        // Map backend data to UI format
        const newThresholds: WithdrawalThresholds = {
          hourly_volume: { value: 0, currency: "USD", enabled: false },
          daily_volume: { value: 0, currency: "USD", enabled: false },
          single_transaction: { value: 0, currency: "USD", enabled: false },
        };

        if (thresholdsData.cumulative_kyc_transaction_limit) {
          newThresholds.single_transaction = {
            value:
              thresholdsData.cumulative_kyc_transaction_limit.usd_amount_cents /
              100,
            currency: "USD",
            enabled: thresholdsData.cumulative_kyc_transaction_limit.enabled,
          };
        }
        if (thresholdsData.kyc_threshold) {
          newThresholds.daily_volume = {
            value: thresholdsData.kyc_threshold.usd_amount_cents / 100,
            currency: "USD",
            enabled: thresholdsData.kyc_threshold.enabled,
          };
        }

        setThresholds(newThresholds);
        setOriginalThresholds(JSON.parse(JSON.stringify(newThresholds)));

        if (thresholdsData.withdrawal_manual_review) {
          const manualReviewData = thresholdsData.withdrawal_manual_review;
          const mappedManualReview: WithdrawalManualReview = {
            enabled: manualReviewData.enabled || false,
            single_threshold_cents:
              manualReviewData.single_threshold_cents || 0,
            daily_threshold_cents: manualReviewData.daily_threshold_cents || 0,
          };
          setManualReview(mappedManualReview);
          setOriginalManualReview(
            JSON.parse(JSON.stringify(mappedManualReview)),
          );
        }
      }

      // Fetch chains and withdrawal limits
      await fetchChainsAndLimits();

      try {
        const kycFirstWithdrawalData =
          await wmsService.getRequireKYCOnFirstWithdrawal(
            selectedBrandId || undefined,
          );
        setRequireKYCOnFirstWithdrawal(kycFirstWithdrawalData.enabled);
        setOriginalRequireKYCOnFirstWithdrawal(kycFirstWithdrawalData.enabled);
      } catch (err) {
        console.error("Error fetching require KYC on first withdrawal:", err);
      }

      try {
        const depositMarginData = await wmsService.getDepositMarginPercent(
          selectedBrandId || undefined,
        );
        setDepositMarginPercent(depositMarginData.percent);
        setOriginalDepositMarginPercent(depositMarginData.percent);
      } catch (err) {
        console.error("Error fetching deposit margin percent:", err);
      }

      try {
        const withdrawalMarginData =
          await wmsService.getWithdrawalMarginPercent(
            selectedBrandId || undefined,
          );
        setWithdrawalMarginPercent(withdrawalMarginData.percent);
        setOriginalWithdrawalMarginPercent(withdrawalMarginData.percent);
      } catch (err) {
        console.error("Error fetching withdrawal margin percent:", err);
      }

      try {
        const globalLimitsData = await wmsService.getGlobalWithdrawalLimits(
          selectedBrandId || undefined,
        );
        setGlobalLimits(globalLimitsData);
        setOriginalGlobalLimits(JSON.parse(JSON.stringify(globalLimitsData)));
      } catch (err) {
        console.error("Error fetching global withdrawal limits:", err);
      }

      try {
        console.log("Fetching duplicate account checks...");
        const duplicateChecksData = await wmsService.getDuplicateAccountChecks(
          selectedBrandId || undefined,
        );
        console.log("Duplicate account checks data:", duplicateChecksData);
        setDuplicateAccountChecksEnabled(duplicateChecksData.enabled);
        setOriginalDuplicateAccountChecksEnabled(duplicateChecksData.enabled);
      } catch (err) {
        console.error("Error fetching duplicate account checks:", err);
        toast.error("Failed to fetch duplicate account checks");
      }
    } catch (err: any) {
      toast.error("Failed to fetch settings");
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Validate limits for a chain
  const validateLimits = (
    chainId: string,
    minAmountCents: number,
    maxAmountCents: number,
  ) => {
    const errors: { min?: string; max?: string } = {};

    if (minAmountCents > maxAmountCents) {
      errors.min = "Minimum amount cannot be greater than maximum amount";
      errors.max = "Maximum amount cannot be less than minimum amount";
    }

    if (Object.keys(errors).length > 0) {
      setLimitErrors((prev) => ({ ...prev, [chainId]: errors }));
    } else {
      setLimitErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[chainId];
        return newErrors;
      });
    }

    return Object.keys(errors).length === 0;
  };

  const fetchChainsAndLimits = async () => {
    try {
      setLoadingLimits(true);

      const chainConfigs = await wmsService.getChainConfigs(100, 0);
      const chainsList = Array.isArray(chainConfigs) ? chainConfigs : [];
      setChains(chainsList);

      try {
        const allLimitsData = await wmsService.getWithdrawalLimits(
          undefined,
          selectedBrandId || undefined,
        );
        if (allLimitsData && typeof allLimitsData === "object") {
          // Handle response structure: { limits: {...}, validation_enabled: boolean, global_limits: {...} }
          const limits = allLimitsData.limits || allLimitsData;
          const validationEnabled =
            allLimitsData.validation_enabled !== undefined
              ? allLimitsData.validation_enabled
              : true;

          setWithdrawalLimits(limits);
          setOriginalWithdrawalLimits(JSON.parse(JSON.stringify(limits)));
          setValidationEnabled(validationEnabled);

          // Handle global limits if present in response
          if (allLimitsData.global_limits) {
            setGlobalLimits(allLimitsData.global_limits);
            setOriginalGlobalLimits(
              JSON.parse(JSON.stringify(allLimitsData.global_limits)),
            );
          }

          // Validate all loaded limits
          Object.keys(limits).forEach((chainId) => {
            const limit = limits[chainId];
            if (
              limit &&
              limit.min_amount_cents !== undefined &&
              limit.max_amount_cents !== undefined
            ) {
              validateLimits(
                chainId,
                limit.min_amount_cents,
                limit.max_amount_cents,
              );
            }
          });
        } else {
          // If that doesn't work, fetch per chain
          await fetchLimitsPerChain(chainsList);
        }
      } catch (err) {
        await fetchLimitsPerChain(chainsList);
      }
    } catch (err: any) {
      console.error("Error fetching chains and limits:", err);
      toast.error("Failed to fetch withdrawal limits");
    } finally {
      setLoadingLimits(false);
    }
  };

  const fetchLimitsPerChain = async (chainsList: ChainConfig[]) => {
    const limits: Record<string, WithdrawalLimit> = {};
    const promises = chainsList.map(async (chain) => {
      try {
        const limitData = await wmsService.getWithdrawalLimits(
          chain.chain_id,
          selectedBrandId || undefined,
        );
        // Handle response format - could be direct limit object or wrapped in chain_id key
        if (limitData) {
          if (limitData[chain.chain_id]) {
            limits[chain.chain_id] = limitData[chain.chain_id];
          } else if (limitData.chain_id === chain.chain_id) {
            limits[chain.chain_id] = limitData;
          }
        }
      } catch (err) {
        console.error(
          `Failed to fetch limits for chain ${chain.chain_id}:`,
          err,
        );
      }
    });
    await Promise.all(promises);
    setWithdrawalLimits(limits);
    setOriginalWithdrawalLimits(JSON.parse(JSON.stringify(limits)));

    // Validate all loaded limits
    Object.keys(limits).forEach((chainId) => {
      const limit = limits[chainId];
      validateLimits(chainId, limit.min_amount_cents, limit.max_amount_cents);
    });
  };

  // Check if global status has changed
  const hasGlobalStatusChanged = () => {
    return (
      JSON.stringify(globalStatus) !== JSON.stringify(originalGlobalStatus)
    );
  };

  // Check if thresholds have changed
  const hasThresholdsChanged = () => {
    return JSON.stringify(thresholds) !== JSON.stringify(originalThresholds);
  };

  // Check if manual review has changed
  const hasManualReviewChanged = () => {
    return (
      JSON.stringify(manualReview) !== JSON.stringify(originalManualReview)
    );
  };

  // Check if require KYC on first withdrawal has changed
  const hasRequireKYCOnFirstWithdrawalChanged = () => {
    return requireKYCOnFirstWithdrawal !== originalRequireKYCOnFirstWithdrawal;
  };

  // Check if deposit margin has changed
  const hasDepositMarginChanged = () => {
    return depositMarginPercent !== originalDepositMarginPercent;
  };

  // Check if withdrawal margin has changed
  const hasWithdrawalMarginChanged = () => {
    return withdrawalMarginPercent !== originalWithdrawalMarginPercent;
  };

  const saveRequireKYCOnFirstWithdrawal = async () => {
    try {
      setSavingKYCOnFirstWithdrawal(true);
      const response = await wmsService.updateRequireKYCOnFirstWithdrawal(
        requireKYCOnFirstWithdrawal,
        selectedBrandId || undefined,
      );
      setOriginalRequireKYCOnFirstWithdrawal(response.enabled);
      toast.success("KYC on first withdrawal setting updated successfully");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Failed to update KYC on first withdrawal setting",
      );
      console.error("Error updating KYC on first withdrawal setting:", err);
    } finally {
      setSavingKYCOnFirstWithdrawal(false);
    }
  };

  const saveDepositMargin = async () => {
    try {
      if (depositMarginPercent < 0 || depositMarginPercent > 100) {
        toast.error("Margin percent must be between 0 and 100");
        return;
      }
      setSavingDepositMargin(true);
      const response = await wmsService.updateDepositMarginPercent(
        depositMarginPercent,
        selectedBrandId || undefined,
      );
      setOriginalDepositMarginPercent(response.percent);
      toast.success("Deposit margin percent updated successfully");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Failed to update deposit margin percent",
      );
      console.error("Error updating deposit margin percent:", err);
    } finally {
      setSavingDepositMargin(false);
    }
  };

  const saveWithdrawalMargin = async () => {
    try {
      if (withdrawalMarginPercent < 0 || withdrawalMarginPercent > 100) {
        toast.error("Margin percent must be between 0 and 100");
        return;
      }
      setSavingWithdrawalMargin(true);
      const response = await wmsService.updateWithdrawalMarginPercent(
        withdrawalMarginPercent,
        selectedBrandId || undefined,
      );
      setOriginalWithdrawalMarginPercent(response.percent);
      toast.success("Withdrawal margin percent updated successfully");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Failed to update withdrawal margin percent",
      );
      console.error("Error updating withdrawal margin percent:", err);
    } finally {
      setSavingWithdrawalMargin(false);
    }
  };

  const saveDuplicateAccountChecks = async () => {
    try {
      console.log(
        "Saving duplicate account checks:",
        duplicateAccountChecksEnabled,
      );
      setSavingDuplicateAccountChecks(true);
      const response = await wmsService.updateDuplicateAccountChecks(
        duplicateAccountChecksEnabled,
        selectedBrandId || undefined,
      );
      console.log("Update response:", response);
      setDuplicateAccountChecksEnabled(response.enabled);
      setOriginalDuplicateAccountChecksEnabled(response.enabled);
      toast.success("Duplicate account checks updated successfully");
    } catch (err: any) {
      console.error("Error updating duplicate account checks:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to update duplicate account checks",
      );
    } finally {
      setSavingDuplicateAccountChecks(false);
    }
  };

  const hasDuplicateAccountChecksChanged = () => {
    return (
      duplicateAccountChecksEnabled !== originalDuplicateAccountChecksEnabled
    );
  };

  // Check if specific chain limits have changed
  const hasChainLimitsChanged = (chainId: string) => {
    const current = withdrawalLimits[chainId];
    const original = originalWithdrawalLimits[chainId];
    if (!current && !original) return false;
    if (!current || !original) return true;
    return (
      current.max_amount_cents !== original.max_amount_cents ||
      current.min_amount_cents !== original.min_amount_cents
    );
  };

  // Check if chain has validation errors
  const hasValidationErrors = (chainId: string) => {
    return limitErrors[chainId] && Object.keys(limitErrors[chainId]).length > 0;
  };

  const saveChainLimits = async (chainId: string) => {
    const limit = withdrawalLimits[chainId];
    if (!limit) return;

    try {
      setSavingLimits((prev) => ({ ...prev, [chainId]: true }));

      const response = await wmsService.updateWithdrawalLimits(
        chainId,
        limit.max_amount_cents,
        limit.min_amount_cents,
        selectedBrandId || undefined,
      );

      if (response.success === true || response.success === undefined) {
        setOriginalWithdrawalLimits((prev) => ({
          ...prev,
          [chainId]: JSON.parse(JSON.stringify(limit)),
        }));
        // Clear validation errors on successful save
        setLimitErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[chainId];
          return newErrors;
        });
        toast.success(`Withdrawal limits for ${chainId} updated successfully`);
      } else {
        toast.error(
          response.message || `Failed to update limits for ${chainId}`,
        );
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || `Failed to update limits for ${chainId}`,
      );
      console.error("Error updating limits:", err);
    } finally {
      setSavingLimits((prev) => ({ ...prev, [chainId]: false }));
    }
  };

  const toggleValidation = async () => {
    try {
      setSavingValidationToggle(true);
      const newValue = !validationEnabled;

      if (newValue && globalLimits.enabled) {
        toast.error(
          "Cannot enable per-chain validation when global limits are enabled. Please disable global limits first.",
        );
        setSavingValidationToggle(false);
        return;
      }

      const response = await wmsService.toggleWithdrawalLimitValidation(
        newValue,
        selectedBrandId || undefined,
      );
      setValidationEnabled(response.enabled);
      toast.success(
        `Withdrawal limit validation ${response.enabled ? "enabled" : "disabled"} successfully`,
      );
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Failed to toggle withdrawal limit validation",
      );
      console.error("Error toggling validation:", err);
    } finally {
      setSavingValidationToggle(false);
    }
  };

  const validateGlobalLimits = (
    minAmountCents: number,
    maxAmountCents: number,
    enabled: boolean,
  ) => {
    const errors: { min?: string; max?: string } = {};

    if (enabled) {
      if (minAmountCents <= 0) {
        errors.min = "Minimum amount must be greater than 0 when enabled";
      }
      if (maxAmountCents <= 0) {
        errors.max = "Maximum amount must be greater than 0 when enabled";
      }
      if (minAmountCents > maxAmountCents) {
        errors.min = "Minimum amount cannot be greater than maximum amount";
        errors.max = "Maximum amount cannot be less than minimum amount";
      }
    }

    setGlobalLimitsErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveGlobalLimits = async () => {
    if (
      !validateGlobalLimits(
        globalLimits.min_amount_cents,
        globalLimits.max_amount_cents,
        globalLimits.enabled,
      )
    ) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    if (globalLimits.enabled && validationEnabled) {
      toast.error(
        "Cannot enable global limits when per-chain validation is enabled. Please disable per-chain validation first.",
      );
      return;
    }

    try {
      setSavingGlobalLimits(true);
      const response = await wmsService.updateGlobalWithdrawalLimits(
        globalLimits.min_amount_cents,
        globalLimits.max_amount_cents,
        globalLimits.enabled,
        selectedBrandId || undefined,
      );
      setGlobalLimits(response);
      setOriginalGlobalLimits(JSON.parse(JSON.stringify(response)));
      toast.success("Global withdrawal limits updated successfully");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Failed to update global withdrawal limits",
      );
      console.error("Error updating global limits:", err);
    } finally {
      setSavingGlobalLimits(false);
    }
  };

  const saveGlobalStatus = async () => {
    try {
      setSavingGlobalStatus(true);

      const reason = globalStatus.reason || "";
      const response = await wmsService.toggleWithdrawalGlobalStatus(
        reason,
        selectedBrandId || undefined,
      );

      if (response.success === true || response.success === undefined) {
        const updatedStatus = await wmsService.getWithdrawalGlobalStatus(
          selectedBrandId || undefined,
        );
        if (updatedStatus) {
          setGlobalStatus(updatedStatus);
          setOriginalGlobalStatus(JSON.parse(JSON.stringify(updatedStatus)));
        }
        toast.success(response.message || "Global status updated successfully");
      } else {
        toast.error(response.message || "Failed to update global status");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to update global status",
      );
      console.error("Error updating global status:", err);
    } finally {
      setSavingGlobalStatus(false);
    }
  };

  const saveThresholds = async () => {
    try {
      setSavingThresholds(true);

      const updateData = {
        cumulative_kyc_transaction_limit: {
          usd_amount_cents: Math.round(
            thresholds.single_transaction.value * 100,
          ),
          enabled: thresholds.single_transaction.enabled,
        },
        kyc_threshold: {
          usd_amount_cents: Math.round(thresholds.daily_volume.value * 100),
          enabled: thresholds.daily_volume.enabled,
        },
      };

      const response = await wmsService.updateWithdrawalThresholds(
        updateData,
        selectedBrandId || undefined,
      );
      if (response.success === true || response.success === undefined) {
        setOriginalThresholds(JSON.parse(JSON.stringify(thresholds)));
        toast.success(response.message || "Thresholds updated successfully");
      } else {
        toast.error(response.message || "Failed to update thresholds");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update thresholds");
      console.error("Error updating thresholds:", err);
    } finally {
      setSavingThresholds(false);
    }
  };

  const saveManualReview = async () => {
    try {
      setSavingManualReview(true);

      const updateData = {
        withdrawal_manual_review: manualReview,
      };

      const response = await wmsService.updateWithdrawalThresholds(
        updateData,
        selectedBrandId || undefined,
      );
      if (response.success === true || response.success === undefined) {
        setOriginalManualReview(JSON.parse(JSON.stringify(manualReview)));
        toast.success(
          response.message || "Manual review settings updated successfully",
        );
      } else {
        toast.error(
          response.message || "Failed to update manual review settings",
        );
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Failed to update manual review settings",
      );
      console.error("Error updating manual review settings:", err);
    } finally {
      setSavingManualReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadingBrands ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
            <span className="text-gray-400 text-sm">Loading brands...</span>
          </div>
        </div>
      ) : brands.length > 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Brand
          </label>
          <select
            value={selectedBrandId || ""}
            onChange={(e) => handleBrandChange(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name} ({brand.code})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Withdrawal Settings</h1>
          <p className="text-gray-400 mt-1">
            Configure withdrawal pause system and thresholds
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Global Status Settings */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Pause className="h-5 w-5 mr-2" />
            Global Withdrawal Status
          </h3>
          <button
            onClick={saveGlobalStatus}
            disabled={savingGlobalStatus || !hasGlobalStatusChanged()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{savingGlobalStatus ? "Saving..." : "Save"}</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() =>
                setGlobalStatus((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                globalStatus.enabled ? "bg-purple-600" : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  globalStatus.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-white font-medium">
              {globalStatus.enabled
                ? "Withdrawals Enabled"
                : "Withdrawals Paused"}
            </span>
          </div>

          {!globalStatus.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Pause Reason
              </label>
              <textarea
                value={globalStatus.reason || ""}
                onChange={(e) =>
                  setGlobalStatus((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder="Enter reason for pausing withdrawals..."
                rows={3}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              />
            </div>
          )}

          {globalStatus.paused_by && (
            <div className="text-sm text-gray-400">
              <p>Paused by: {globalStatus.paused_by}</p>
              {globalStatus.paused_at && (
                <p>
                  Paused at: {new Date(globalStatus.paused_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Threshold Settings */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Withdrawal Thresholds
          </h3>
          <button
            onClick={saveThresholds}
            disabled={savingThresholds || !hasThresholdsChanged()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{savingThresholds ? "Saving..." : "Save"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hourly Volume */}
          <div className="space-y-3 hidden">
            <div className="flex items-center space-x-3">
              <button
                onClick={() =>
                  setThresholds((prev) => ({
                    ...prev,
                    hourly_volume: {
                      ...prev.hourly_volume,
                      enabled: !prev.hourly_volume.enabled,
                    },
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  thresholds.hourly_volume.enabled
                    ? "bg-purple-600"
                    : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    thresholds.hourly_volume.enabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-white font-medium">
                Hourly Volume Limit
              </span>
            </div>
            <div className="flex space-x-2">
              <input
                type="number"
                value={thresholds.hourly_volume.value}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    hourly_volume: {
                      ...prev.hourly_volume,
                      value: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
                placeholder="0"
                className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              />
              <select
                value={thresholds.hourly_volume.currency}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    hourly_volume: {
                      ...prev.hourly_volume,
                      currency: e.target.value,
                    },
                  }))
                }
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="BTC">BTC</option>
              </select>
            </div>
          </div>

          {/* Daily Volume */}
          <div className="space-y-3 hidden">
            <div className="flex items-center space-x-3">
              <button
                onClick={() =>
                  setThresholds((prev) => ({
                    ...prev,
                    daily_volume: {
                      ...prev.daily_volume,
                      enabled: !prev.daily_volume.enabled,
                    },
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  thresholds.daily_volume.enabled
                    ? "bg-purple-600"
                    : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    thresholds.daily_volume.enabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-white font-medium">
                Daily Transaction Limit (KYC)
              </span>
            </div>
            <div className="flex space-x-2">
              <input
                type="number"
                value={thresholds.daily_volume.value}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    daily_volume: {
                      ...prev.daily_volume,
                      value: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
                placeholder="0"
                className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              />
              <select
                value={thresholds.daily_volume.currency}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    daily_volume: {
                      ...prev.daily_volume,
                      currency: e.target.value,
                    },
                  }))
                }
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="BTC">BTC</option>
              </select>
            </div>
          </div>

          {/* Single Transaction */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() =>
                  setThresholds((prev) => ({
                    ...prev,
                    single_transaction: {
                      ...prev.single_transaction,
                      enabled: !prev.single_transaction.enabled,
                    },
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  thresholds.single_transaction.enabled
                    ? "bg-purple-600"
                    : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    thresholds.single_transaction.enabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-white font-medium">
                Cumulative KYC Transaction Limit
              </span>
            </div>
            <div className="flex space-x-2">
              <input
                type="number"
                value={thresholds.single_transaction.value}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    single_transaction: {
                      ...prev.single_transaction,
                      value: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
                placeholder="0"
                className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              />
              <select
                value={thresholds.single_transaction.currency}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    single_transaction: {
                      ...prev.single_transaction,
                      currency: e.target.value,
                    },
                  }))
                }
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="BTC">BTC</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Review Settings */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Manual Review Settings
          </h3>
          <button
            onClick={saveManualReview}
            disabled={savingManualReview || !hasManualReviewChanged()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{savingManualReview ? "Saving..." : "Save"}</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() =>
                setManualReview((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                manualReview.enabled ? "bg-purple-600" : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  manualReview.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-white font-medium">Enable Manual Review</span>
          </div>

          {manualReview.enabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Single Transaction Threshold (USD)
                </label>
                <input
                  type="number"
                  value={manualReview.single_threshold_cents / 100}
                  onChange={(e) =>
                    setManualReview((prev) => ({
                      ...prev,
                      single_threshold_cents:
                        (parseFloat(e.target.value) || 0) * 100,
                    }))
                  }
                  placeholder="0"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Daily Threshold (USD)
                </label>
                <input
                  type="number"
                  value={manualReview.daily_threshold_cents / 100}
                  onChange={(e) =>
                    setManualReview((prev) => ({
                      ...prev,
                      daily_threshold_cents:
                        (parseFloat(e.target.value) || 0) * 100,
                    }))
                  }
                  placeholder="0"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Require KYC on First Withdrawal */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Require KYC on First Withdrawal
          </h3>
          <button
            onClick={saveRequireKYCOnFirstWithdrawal}
            disabled={
              savingKYCOnFirstWithdrawal ||
              !hasRequireKYCOnFirstWithdrawalChanged()
            }
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{savingKYCOnFirstWithdrawal ? "Saving..." : "Save"}</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setRequireKYCOnFirstWithdrawal((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                requireKYCOnFirstWithdrawal ? "bg-purple-600" : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  requireKYCOnFirstWithdrawal
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-white font-medium">
              {requireKYCOnFirstWithdrawal ? "Enabled" : "Disabled"}
            </span>
          </div>

          <p className="text-sm text-gray-400">
            When enabled, users must have approved KYC status before their first
            withdrawal is approved, regardless of the withdrawal amount.
          </p>

          {requireKYCOnFirstWithdrawal && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                <strong>Active:</strong> Users without approved KYC status will
                require admin review for their first withdrawal.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Deposit Margin Settings */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Deposit Margin Percent
          </h3>
          <button
            onClick={saveDepositMargin}
            disabled={savingDepositMargin || !hasDepositMarginChanged()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{savingDepositMargin ? "Saving..." : "Save"}</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Margin Percentage (0-100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={depositMarginPercent}
              onChange={(e) =>
                setDepositMarginPercent(parseFloat(e.target.value) || 0)
              }
              placeholder="0.00"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>

          <p className="text-sm text-gray-400">
            The deposit margin reduces the amount credited to users. For
            example, if set to 10%, a user depositing 100 USD worth of crypto
            will see 90 USD credited to their account.
          </p>

          {depositMarginPercent > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                <strong>Active:</strong> Users will receive{" "}
                {100 - depositMarginPercent}% of their deposit amount.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Margin Settings */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Withdrawal Margin Percent
          </h3>
          <button
            onClick={saveWithdrawalMargin}
            disabled={savingWithdrawalMargin || !hasWithdrawalMarginChanged()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{savingWithdrawalMargin ? "Saving..." : "Save"}</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Margin Percentage (0-100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={withdrawalMarginPercent}
              onChange={(e) =>
                setWithdrawalMarginPercent(parseFloat(e.target.value) || 0)
              }
              placeholder="0.00"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>

          <p className="text-sm text-gray-400">
            The withdrawal margin reduces the amount sent to users. For example,
            if set to 5%, a user requesting 100 USD worth of crypto will receive
            95 USD worth. The user still pays the full 100 USD from their
            balance.
          </p>

          {withdrawalMarginPercent > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                <strong>Active:</strong> Users will receive{" "}
                {100 - withdrawalMarginPercent}% of their requested withdrawal
                amount.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Duplicate Account Checks */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Duplicate Account Checks
          </h3>
          <button
            onClick={saveDuplicateAccountChecks}
            disabled={
              savingDuplicateAccountChecks ||
              !hasDuplicateAccountChecksChanged()
            }
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{savingDuplicateAccountChecks ? "Saving..." : "Save"}</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="duplicate-account-checks"
              checked={duplicateAccountChecksEnabled}
              onChange={(e) =>
                setDuplicateAccountChecksEnabled(e.target.checked)
              }
              className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-2"
            />
            <label
              htmlFor="duplicate-account-checks"
              className="text-sm font-medium text-gray-300 cursor-pointer"
            >
              Enable Duplicate Account Checks
            </label>
          </div>

          <p className="text-sm text-gray-400">
            When enabled, the system will check for duplicate accounts to
            prevent fraud and abuse.
          </p>

          {duplicateAccountChecksEnabled && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <p className="text-sm text-green-300">
                <strong>Active:</strong> Duplicate account checks are currently
                enabled.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Global Withdrawal Limits */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Global Withdrawal Limits
          </h3>
          <button
            onClick={saveGlobalLimits}
            disabled={
              savingGlobalLimits ||
              JSON.stringify(globalLimits) ===
                JSON.stringify(originalGlobalLimits)
            }
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{savingGlobalLimits ? "Saving..." : "Save"}</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400">Enabled:</span>
            <button
              onClick={() => {
                if (validationEnabled) {
                  toast.error(
                    "Cannot enable global limits when per-chain validation is enabled. Please disable per-chain validation first.",
                  );
                  return;
                }
                setGlobalLimits((prev) => ({
                  ...prev,
                  enabled: !prev.enabled,
                }));
              }}
              disabled={validationEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                globalLimits.enabled ? "bg-purple-600" : "bg-gray-600"
              } ${validationEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  globalLimits.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-white">
              {globalLimits.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          {globalLimits.enabled && validationEnabled && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-300">
                <strong>Error:</strong> Cannot enable global limits when
                per-chain validation is enabled. Please disable per-chain
                validation first.
              </p>
            </div>
          )}

          {globalLimits.enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Minimum Amount (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={globalLimits.min_amount_cents / 100}
                    onChange={(e) => {
                      const usdValue = parseFloat(e.target.value) || 0;
                      const centsValue = Math.round(usdValue * 100);
                      setGlobalLimits((prev) => ({
                        ...prev,
                        min_amount_cents: centsValue,
                      }));
                      validateGlobalLimits(
                        centsValue,
                        globalLimits.max_amount_cents,
                        globalLimits.enabled,
                      );
                    }}
                    placeholder="0.00"
                    className={`w-full bg-gray-700 text-white border rounded-lg px-3 py-2 ${
                      globalLimitsErrors.min
                        ? "border-red-500"
                        : "border-gray-600"
                    }`}
                  />
                  {globalLimitsErrors.min && (
                    <p className="text-red-400 text-xs mt-1">
                      {globalLimitsErrors.min}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Maximum Amount (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={globalLimits.max_amount_cents / 100}
                    onChange={(e) => {
                      const usdValue = parseFloat(e.target.value) || 0;
                      const centsValue = Math.round(usdValue * 100);
                      setGlobalLimits((prev) => ({
                        ...prev,
                        max_amount_cents: centsValue,
                      }));
                      validateGlobalLimits(
                        globalLimits.min_amount_cents,
                        centsValue,
                        globalLimits.enabled,
                      );
                    }}
                    placeholder="0.00"
                    className={`w-full bg-gray-700 text-white border rounded-lg px-3 py-2 ${
                      globalLimitsErrors.max
                        ? "border-red-500"
                        : "border-gray-600"
                    }`}
                  />
                  {globalLimitsErrors.max && (
                    <p className="text-red-400 text-xs mt-1">
                      {globalLimitsErrors.max}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-300">
                  <strong>Info:</strong> Global limits apply to all chains
                  uniformly when enabled. These limits are used when per-chain
                  validation is disabled.
                </p>
              </div>

              {globalLimits.min_amount_cents > 0 &&
                globalLimits.max_amount_cents > 0 && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <p className="text-sm text-green-300">
                      <strong>Active Limits:</strong> Min: $
                      {(globalLimits.min_amount_cents / 100).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}{" "}
                      | Max: $
                      {(globalLimits.max_amount_cents / 100).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}
                    </p>
                  </div>
                )}
            </>
          )}

          {!globalLimits.enabled && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-sm text-yellow-300">
                <strong>Note:</strong> Global withdrawal limits are disabled.
                Withdrawals will not be validated against global min/max limits.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Limits by Chain */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Withdrawal Limits by Chain
          </h3>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-400">Validation:</span>
              <button
                onClick={toggleValidation}
                disabled={savingValidationToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  validationEnabled ? "bg-purple-600" : "bg-gray-600"
                } ${savingValidationToggle ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    validationEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-white">
                {validationEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <button
              onClick={fetchChainsAndLimits}
              disabled={loadingLimits}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm"
            >
              <RefreshCw
                className={`h-4 w-4 ${loadingLimits ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {!validationEnabled && (
          <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-sm text-yellow-300">
              <strong>Warning:</strong> Withdrawal limit validation is disabled.
              Min/max limit checks are currently skipped for all chains.
            </p>
          </div>
        )}

        {loadingLimits ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
            <span className="ml-2 text-gray-400 text-sm">
              Loading limits...
            </span>
          </div>
        ) : (
          (() => {
            const filteredChains = chains.filter((chain) => {
              // Filter out testnets if useTestnets is false
              if (!useTestnets) {
                const isTestnet =
                  chain.is_testnet === true ||
                  chain.chain_id.includes("-testnet");
                return !isTestnet;
              }
              return true;
            });

            return filteredChains.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                No chains found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">
                        Chain
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">
                        Min Amount (USD)
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">
                        Max Amount (USD)
                      </th>
                      <th className="text-right py-2 px-3 text-sm font-semibold text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChains.map((chain) => {
                      const limit = withdrawalLimits[chain.chain_id] || {
                        chain_id: chain.chain_id,
                        max_amount_cents: 0,
                        min_amount_cents: 0,
                      };
                      const isSaving = savingLimits[chain.chain_id] || false;
                      const hasChanged = hasChainLimitsChanged(chain.chain_id);

                      return (
                        <tr
                          key={chain.chain_id}
                          className="border-b border-gray-700 hover:bg-gray-750"
                        >
                          <td className="py-2 px-3 text-sm text-white">
                            {chain.name || chain.chain_id}
                          </td>
                          <td className="py-2 px-3">
                            <div>
                              <input
                                type="number"
                                value={limit.min_amount_cents / 100}
                                onChange={(e) => {
                                  const value =
                                    (parseFloat(e.target.value) || 0) * 100;
                                  const updatedLimit = {
                                    ...limit,
                                    min_amount_cents: value,
                                  };
                                  setWithdrawalLimits((prev) => ({
                                    ...prev,
                                    [chain.chain_id]: updatedLimit,
                                  }));
                                  validateLimits(
                                    chain.chain_id,
                                    value,
                                    limit.max_amount_cents,
                                  );
                                }}
                                placeholder="0.00"
                                step="0.01"
                                className={`w-full bg-gray-700 text-white border rounded px-2 py-1 text-sm ${
                                  limitErrors[chain.chain_id]?.min
                                    ? "border-red-500"
                                    : "border-gray-600"
                                }`}
                              />
                              {limitErrors[chain.chain_id]?.min && (
                                <p className="text-red-500 text-xs mt-1">
                                  {limitErrors[chain.chain_id].min}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div>
                              <input
                                type="number"
                                value={limit.max_amount_cents / 100}
                                onChange={(e) => {
                                  const value =
                                    (parseFloat(e.target.value) || 0) * 100;
                                  const updatedLimit = {
                                    ...limit,
                                    max_amount_cents: value,
                                  };
                                  setWithdrawalLimits((prev) => ({
                                    ...prev,
                                    [chain.chain_id]: updatedLimit,
                                  }));
                                  validateLimits(
                                    chain.chain_id,
                                    limit.min_amount_cents,
                                    value,
                                  );
                                }}
                                placeholder="0.00"
                                step="0.01"
                                className={`w-full bg-gray-700 text-white border rounded px-2 py-1 text-sm ${
                                  limitErrors[chain.chain_id]?.max
                                    ? "border-red-500"
                                    : "border-gray-600"
                                }`}
                              />
                              {limitErrors[chain.chain_id]?.max && (
                                <p className="text-red-500 text-xs mt-1">
                                  {limitErrors[chain.chain_id].max}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => saveChainLimits(chain.chain_id)}
                              disabled={
                                isSaving ||
                                !hasChanged ||
                                hasValidationErrors(chain.chain_id)
                              }
                              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-2 py-1 rounded text-xs flex items-center space-x-1 ml-auto"
                            >
                              <Save className="h-3 w-3" />
                              <span>{isSaving ? "Saving..." : "Save"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default WithdrawalSettings;
