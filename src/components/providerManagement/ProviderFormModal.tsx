import React, { useState } from "react";
import { X } from "lucide-react";
import { CreateProviderRequest, UpdateProviderRequest } from "../../services/providerService";

interface ProviderFormModalProps {
  title: string;
  initial: {
    name: string;
    code: string;
    description: string;
    api_url: string;
    webhook_url: string;
    is_active: boolean;
    integration_type: string;
  };
  onClose: () => void;
  onSave: (data: CreateProviderRequest | UpdateProviderRequest) => void;
  saving: boolean;
  submitLabel: string;
}

export function ProviderFormModal({
  title,
  initial,
  onClose,
  onSave,
  saving,
  submitLabel,
}: ProviderFormModalProps) {
  const [form, setForm] = useState(initial);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || undefined,
      api_url: form.api_url.trim() || undefined,
      webhook_url: form.webhook_url.trim() || undefined,
      is_active: form.is_active,
      integration_type: form.integration_type || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-slate-900/98 to-slate-950/98 border border-slate-800/80 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700/80 flex items-center justify-between sticky top-0 bg-slate-900/95">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">API URL</label>
            <input
              type="url"
              value={form.api_url}
              onChange={(e) => setForm((p) => ({ ...p, api_url: e.target.value }))}
              placeholder="https://"
              className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Webhook URL</label>
            <input
              type="url"
              value={form.webhook_url}
              onChange={(e) => setForm((p) => ({ ...p, webhook_url: e.target.value }))}
              placeholder="https://"
              className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Integration Type</label>
            <select
              value={form.integration_type}
              onChange={(e) => setForm((p) => ({ ...p, integration_type: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value="API">API</option>
              <option value="Aggregator">Aggregator</option>
              <option value="Direct">Direct</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500/20 focus:ring-2"
            />
            <label htmlFor="is_active" className="text-sm text-slate-300">
              Active
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 border border-slate-600/50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 font-medium shadow-lg shadow-red-500/20"
            >
              {saving ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
