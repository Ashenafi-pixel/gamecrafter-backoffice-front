import React from "react";
import { Building2 } from "lucide-react";

export const BrandReport: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="h-7 w-7 text-slate-400" />
          Brand Reports
        </h1>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
        <p className="text-slate-400">Brand report content will appear here.</p>
      </div>
    </div>
  );
};
