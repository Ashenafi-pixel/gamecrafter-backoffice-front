import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "react-hot-toast";

interface CopyableTextProps {
  text: string;
  className?: string;
  showIcon?: boolean;
  label?: string;
  displayText?: string;
}

export const CopyableText: React.FC<CopyableTextProps> = ({
  text,
  className = "",
  showIcon = true,
  label,
  displayText,
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(
        label ? `${label} copied to clipboard` : "Copied to clipboard",
      );
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-white font-mono text-sm">
        {displayText || text}
      </span>
      {showIcon && (
        <button
          onClick={copyToClipboard}
          className="text-gray-400 hover:text-blue-400 transition-colors p-0.5"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
};
