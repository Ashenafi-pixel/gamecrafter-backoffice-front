import type { Brand } from "../services/brandService";

/**
 * Demo/sample brands used by Brand Management sidebar and by
 * Settings "Configure for brand" and Access Control brand dropdowns.
 * No API calls – frontend-only mock data.
 */
export function getMockBrands(): Brand[] {
  const now = new Date().toISOString();
  const names = [
    "Royal Casino",
    "Lucky Spins",
    "Grand Slots",
    "Ace Gaming",
    "Diamond Bet",
    "Crown Play",
    "Golden Reel",
    "Platinum Casino",
    "Star Vegas",
    "Elite Gaming",
  ];
  const codes = ["RC", "LS", "GS", "AG", "DB", "CP", "GR", "PC", "SV", "EG"];
  const types = ["API", "Aggregator", "Direct"];
  return names.map((name, i) => ({
    id: i + 1,
    name,
    code: codes[i],
    domain: `${codes[i].toLowerCase()}.gamecrafter.io`,
    description: `${name} integration for GameCrafter backoffice.`,
    api_url: `https://api.${codes[i].toLowerCase()}.example.com/v1`,
    webhook_url: `https://webhooks.${codes[i].toLowerCase()}.example.com/events`,
    integration_type: types[i % 3],
    is_active: i % 3 !== 2,
    created_at: now,
    updated_at: now,
  }));
}
