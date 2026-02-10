/*
* This file defines the constant values used in the scheduler.
*/

export const HEARTBEAT = 15000;


export const SCHEDULER_INTERVAL = 1000; // 1 second
export const SUMMARY_INTERVAL = 60000; // 1 minute

// AI Logs older than this are deleted - summaries are kept
export const AI_LOG_CUTOFF = 1000 * 60 * 60 * 24 // 1 day

export const ALERTS_COOLDOWN = SCHEDULER_INTERVAL * 60; //Max speed which alerts can be triggered

// This determines which models the evaluator should run on / should be visible on the frontend.
// This list checks for js files with the same name in the ai_models folder.
export const AI_MODELS = ["GoodModel", "BadModel"];
