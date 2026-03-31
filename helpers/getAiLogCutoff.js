import SystemSetting from '../models/SystemSetting.js';
import { AI_LOG_CUTOFF } from '../constants/sse.js';

/**
 * Returns the AI log cutoff in milliseconds.
 * Reads from the database if a custom value has been set, otherwise falls back to the constant.
 */
export async function getAiLogCutoff() {
  try {
    const setting = await SystemSetting.findOne({ key: 'ai_log_cutoff' }).lean();
    if (setting && typeof setting.value === 'number' && setting.value > 0) {
      return setting.value;
    }
  } catch (err) {
    console.error('Error reading AI log cutoff setting:', err);
  }
  return AI_LOG_CUTOFF;
}
