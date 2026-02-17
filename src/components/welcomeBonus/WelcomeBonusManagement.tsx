import React, { useState, useEffect } from "react";
import { Gift } from "lucide-react";
import { getMockBrands } from "../../mocks/brands";
import { WelcomeBonusChannels } from "../settings/WelcomeBonusChannels";

export const WelcomeBonusManagement: React.FC = () => {
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  useEffect(() => {
    const loadedBrands = getMockBrands().map((b) => ({ id: b.id, name: b.name }));
    setBrands(loadedBrands);
    if (loadedBrands.length > 0) {
      setSelectedBrandId((prev) => prev || loadedBrands[0].id);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <Gift className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">
              Welcome bonus
            </h1>
            <p className="text-sm text-slate-400">
              Manage bonus channels and rules by brand
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/80">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Brand
        </label>
        <select
          value={selectedBrandId || ""}
          onChange={(e) => setSelectedBrandId(e.target.value || null)}
          className="w-full md:w-64 bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
        >
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      <WelcomeBonusChannels brandId={selectedBrandId} />
    </div>
  );
};
