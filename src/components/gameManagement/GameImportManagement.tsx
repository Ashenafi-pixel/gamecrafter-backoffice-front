import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Download, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { gameImportService } from "../../services/gameImportService";
import {
  GameImportConfig,
  UpdateGameImportConfigRequest,
  GameImportTriggerResponse,
  ScheduleType,
  PROVIDER_NAMES,
} from "../../types/gameImport";
import { validateCronExpression } from "../../utils/cronValidator";
import { formatGameImportDate } from "../../utils/dateFormatter";

interface GameImportManagementProps {
  brandId: string;
}

const GameImportManagement: React.FC<GameImportManagementProps> = ({
  brandId,
}) => {
  const [config, setConfig] = useState<GameImportConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] =
    useState<GameImportTriggerResponse | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});

  const [formData, setFormData] = useState<UpdateGameImportConfigRequest>({
    brand_id: brandId,
    schedule_type: "daily",
    schedule_cron: null,
    providers: null,
    directus_url: null,
    check_frequency_minutes: 15,
    is_active: true,
  });

  const loadConfig = useCallback(async () => {
    if (!brandId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await gameImportService.getConfig(brandId);
      if (response.success && response.data) {
        setConfig(response.data);
        setFormData({
          brand_id: brandId,
          schedule_type: response.data.schedule_type,
          schedule_cron: response.data.schedule_cron,
          providers: response.data.providers,
          directus_url: response.data.directus_url,
          check_frequency_minutes: response.data.check_frequency_minutes ?? 15,
          is_active: response.data.is_active,
        });
      }
    } catch (err: any) {
      console.error("Failed to load game import config:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load configuration",
      );
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.brand_id) {
      errors.brand_id = "Brand ID is required";
    }

    if (formData.schedule_type === "custom") {
      if (!formData.schedule_cron || formData.schedule_cron.trim() === "") {
        errors.schedule_cron =
          "Cron expression is required for custom schedule";
      } else {
        const cronValidation = validateCronExpression(formData.schedule_cron);
        if (!cronValidation.valid) {
          errors.schedule_cron =
            cronValidation.error || "Invalid cron expression";
        }
      }
    }

    if (
      formData.check_frequency_minutes !== null &&
      formData.check_frequency_minutes !== undefined
    ) {
      if (
        formData.check_frequency_minutes < 1 ||
        formData.check_frequency_minutes > 1440
      ) {
        errors.check_frequency_minutes =
          "Check frequency must be between 1 and 1440 minutes";
      }
    }

    if (formData.directus_url && formData.directus_url.trim() !== "") {
      try {
        new URL(formData.directus_url);
      } catch {
        errors.directus_url = "Invalid URL format";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveConfig = async () => {
    if (!validateForm()) {
      const firstError = Object.keys(validationErrors)[0];
      if (firstError) {
        const element = document.querySelector(
          `[name="${firstError}"]`,
        ) as HTMLElement;
        element?.focus();
      }
      toast.error("Please fix validation errors");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: UpdateGameImportConfigRequest = {
        brand_id: brandId,
        schedule_type: formData.schedule_type,
        is_active: formData.is_active,
        check_frequency_minutes: formData.check_frequency_minutes ?? 15,
        providers:
          formData.providers && formData.providers.length > 0
            ? formData.providers
            : null,
        directus_url:
          formData.directus_url && formData.directus_url.trim() !== ""
            ? formData.directus_url.trim()
            : null,
        schedule_cron:
          formData.schedule_type === "custom" && formData.schedule_cron
            ? formData.schedule_cron.trim()
            : null,
      };

      const response = await gameImportService.updateConfig(payload);
      if (response.success) {
        toast.success("Configuration saved successfully");
        await loadConfig();
      }
    } catch (err: any) {
      console.error("Failed to save game import config:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to save configuration";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerImport = async () => {
    if (!brandId) {
      toast.error("Brand ID is required");
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setImportResults(null);

      const response = await gameImportService.triggerImport(brandId);
      if (response.success && response.data) {
        setImportResults(response.data);
        toast.success(
          `Imported ${response.data.games_imported} games, ${response.data.house_edges_imported} house edges`,
        );
        await loadConfig();
      }
    } catch (err: any) {
      console.error("Failed to trigger game import:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to trigger import";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  const handleProviderToggle = (provider: string) => {
    const currentProviders = formData.providers || [];
    const isSelected = currentProviders.includes(provider);

    if (isSelected) {
      const updated = currentProviders.filter((p) => p !== provider);
      setFormData({
        ...formData,
        providers: updated.length > 0 ? updated : null,
      });
    } else {
      setFormData({
        ...formData,
        providers: [...currentProviders, provider],
      });
    }
  };

  const handleSelectAllProviders = (checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        providers: null,
      });
    } else {
      setFormData({
        ...formData,
        providers: [],
      });
    }
  };

  const isAllProvidersSelected = formData.providers === null;

  if (loading && !config) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-6 animate-pulse">
          <div className="h-6 bg-slate-700/50 rounded w-1/4 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-slate-700/50 rounded" />
            <div className="h-4 bg-slate-700/50 rounded w-5/6" />
            <div className="h-4 bg-slate-700/50 rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  const inputBase =
    "w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors placeholder-slate-500";
  const inputError = "border-red-500/80 focus:ring-red-500/30 focus:border-red-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Import configuration</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Schedule and run automated game imports from Directus
          </p>
        </div>
        <button
          onClick={handleTriggerImport}
          disabled={importing || !brandId}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Importing…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Run import now
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-start gap-3">
          <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-100">Error</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-slate-700/80">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-5">
            Schedule &amp; settings
          </h3>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Schedule type <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-6">
                {(
                  ["daily", "weekly", "monthly", "custom"] as ScheduleType[]
                ).map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="schedule_type"
                      value={type}
                      checked={formData.schedule_type === type}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          schedule_type: e.target.value as ScheduleType,
                          schedule_cron:
                            e.target.value !== "custom"
                              ? null
                              : formData.schedule_cron,
                        });
                        if (e.target.value !== "custom") {
                          setValidationErrors({
                            ...validationErrors,
                            schedule_cron: "",
                          });
                        }
                      }}
                      className="h-4 w-4 text-red-600 focus:ring-red-500/20 border-slate-600 bg-slate-800"
                    />
                    <span className="text-sm text-slate-300 capitalize">
                      {type === "custom" ? "Custom cron" : type}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {formData.schedule_type === "custom" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cron expression <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="schedule_cron"
                  value={formData.schedule_cron || ""}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      schedule_cron: e.target.value,
                    });
                    if (validationErrors.schedule_cron) {
                      setValidationErrors({
                        ...validationErrors,
                        schedule_cron: "",
                      });
                    }
                  }}
                  placeholder="0 2 * * *"
                  className={`${inputBase} ${validationErrors.schedule_cron ? inputError : ""}`}
                />
                {validationErrors.schedule_cron && (
                  <p className="mt-1.5 text-sm text-red-400">
                    {validationErrors.schedule_cron}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-slate-500">
                  Format: minute hour day month weekday
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Provider filter
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Leave empty to import all providers
              </p>
              <div className="max-h-48 overflow-y-auto border border-slate-700 rounded-xl p-3 bg-slate-950/60">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg hover:bg-slate-800/50 border-b border-slate-700/80 mb-2">
                  <input
                    type="checkbox"
                    checked={isAllProvidersSelected}
                    onChange={(e) => handleSelectAllProviders(e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500/20 border-slate-600 rounded bg-slate-800"
                  />
                  <span className="text-sm font-medium text-slate-200">All providers</span>
                </label>
                {PROVIDER_NAMES.map((provider) => {
                  const isSelected =
                    formData.providers?.includes(provider) || false;
                  return (
                    <label
                      key={provider}
                      className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg hover:bg-slate-800/50"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleProviderToggle(provider)}
                        disabled={isAllProvidersSelected}
                        className="h-4 w-4 text-red-600 focus:ring-red-500/20 border-slate-600 rounded bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm text-slate-300">{provider}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Directus URL
              </label>
              <input
                type="url"
                name="directus_url"
                value={formData.directus_url || ""}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    directus_url: e.target.value,
                  });
                  if (validationErrors.directus_url) {
                    setValidationErrors({
                      ...validationErrors,
                      directus_url: "",
                    });
                  }
                }}
                placeholder="https://your-instance.directus.app/graphql"
                className={`${inputBase} ${validationErrors.directus_url ? inputError : ""}`}
              />
              {validationErrors.directus_url && (
                <p className="mt-1.5 text-sm text-red-400">
                  {validationErrors.directus_url}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Check frequency (minutes)
              </label>
              <input
                type="number"
                name="check_frequency_minutes"
                value={formData.check_frequency_minutes ?? 15}
                onChange={(e) => {
                  const value =
                    e.target.value === "" ? null : parseInt(e.target.value, 10);
                  setFormData({
                    ...formData,
                    check_frequency_minutes: value,
                  });
                  if (validationErrors.check_frequency_minutes) {
                    setValidationErrors({
                      ...validationErrors,
                      check_frequency_minutes: "",
                    });
                  }
                }}
                min={1}
                max={1440}
                className={`${inputBase} max-w-xs ${validationErrors.check_frequency_minutes ? inputError : ""}`}
              />
              {validationErrors.check_frequency_minutes && (
                <p className="mt-1.5 text-sm text-red-400">
                  {validationErrors.check_frequency_minutes}
                </p>
              )}
              <p className="mt-1.5 text-xs text-slate-500">
                How often the scheduler checks for due imports (1–1440)
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="import-is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="h-4 w-4 text-red-600 focus:ring-red-500/20 border-slate-600 rounded bg-slate-800"
              />
              <label htmlFor="import-is_active" className="text-sm font-medium text-slate-300">
                Enable automated imports
              </label>
            </div>
          </div>
        </div>

        {(config?.last_run_at ||
          (config?.next_run_at && config?.is_active) ||
          config?.is_active !== undefined) && (
          <div className="px-6 py-4 border-t border-slate-700/80 bg-slate-800/30">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-3">
              Status
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              {config.is_active ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-green-900/30 text-green-300 border border-green-700/30">
                  <CheckCircle2 className="h-4 w-4" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-slate-800 text-slate-400 border border-slate-600/50">
                  <XCircle className="h-4 w-4" />
                  Inactive
                </span>
              )}
              {config.last_run_at && (
                <span className="text-sm text-slate-400">
                  {formatGameImportDate(config.last_run_at, "Last run:")}
                </span>
              )}
              {config.next_run_at && config.is_active && (
                <span className="text-sm text-red-400/90">
                  {formatGameImportDate(config.next_run_at, "Next run:")}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-700/80 flex justify-end">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save configuration"}
          </button>
        </div>
      </div>

      {importResults && (
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-4">
            Last import results
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-400">Games imported</span>
              <span className="text-white font-medium tabular-nums">{importResults.games_imported}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-400">House edges imported</span>
              <span className="text-white font-medium tabular-nums">{importResults.house_edges_imported}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-400">Total fetched</span>
              <span className="text-white font-medium tabular-nums">{importResults.total_fetched}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-400">Filtered</span>
              <span className="text-white font-medium tabular-nums">{importResults.filtered}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-400">Duplicates skipped</span>
              <span className="text-white font-medium tabular-nums">{importResults.duplicates_skipped}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-400">Errors</span>
              <span className="text-white font-medium tabular-nums">{importResults.errors?.length || 0}</span>
            </div>
          </div>
          {importResults.errors && importResults.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/80">
              <p className="text-sm font-medium text-red-400 mb-2">Error details</p>
              <ul className="space-y-1 text-sm text-red-300 list-disc list-inside">
                {importResults.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameImportManagement;
