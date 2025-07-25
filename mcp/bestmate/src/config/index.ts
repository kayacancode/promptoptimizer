import { BestMateConfig } from '../types/index.js';

export function getBestMateConfig(): BestMateConfig {
  const apiKey = process.env.BESTMATE_API_KEY;
  const baseUrl = process.env.BESTMATE_BASE_URL || 'http://localhost:3000/api/bestmate';

  if (!apiKey) {
    throw new Error('BESTMATE_API_KEY environment variable is required. Generate one at http://localhost:3000/dashboard');
  }

  return {
    apiKey,
    baseUrl
  };
}