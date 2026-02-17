/**
 * @fileoverview Execution profile manager.
 *
 * Manages 3 execution profiles that govern confirmation requirements:
 * - explore: read-only, no writes
 * - guided: confirm before writes (default)
 * - autonomous: full autonomy with quality gates
 *
 * Profiles are orthogonal to mode governance (Article XI).
 * Modes control WHERE; profiles control WHETHER.
 *
 * Constitution Article XVIII — Execution Profile Governance.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Profile Definitions
// ---------------------------------------------------------------------------

/**
 * Execution profile enum.
 * @enum {string}
 */
export const Profile = {
  /** Read-only. Agents analyze and suggest but perform no writes. */
  EXPLORE: 'explore',
  /** Default. Agents propose actions and wait for user confirmation. */
  GUIDED: 'guided',
  /** Full autonomy. Agents execute without confirmation when gates pass. */
  AUTONOMOUS: 'autonomous',
};

/** Minimum gate score required to activate autonomous profile */
export const AUTONOMOUS_GATE_THRESHOLD = 90;

/**
 * Operations that ALWAYS require confirmation regardless of profile.
 * Constitution Article XVIII, point 4.
 */
export const ALWAYS_CONFIRM_OPERATIONS = [
  'file_delete',
  'database_drop',
  'force_push',
  'deploy_production',
  'deviation_activate',
  'backward_transition',
];

// ---------------------------------------------------------------------------
// Profile Management
// ---------------------------------------------------------------------------

/**
 * Get the current execution profile from session state.
 *
 * @param {string} projectDir
 * @returns {string} Current profile (defaults to 'guided')
 */
export function getCurrentProfile(projectDir) {
  const sessionPath = join(projectDir, '.chati', 'session.yaml');
  if (!existsSync(sessionPath)) return Profile.GUIDED;

  const raw = readFileSync(sessionPath, 'utf-8');
  const match = raw.match(/^\s*execution_profile:\s*(.+)$/m);
  const profile = match ? match[1].trim().replace(/^["']|["']$/g, '') : Profile.GUIDED;

  return Object.values(Profile).includes(profile) ? profile : Profile.GUIDED;
}

/**
 * Check if a write operation is allowed under the current profile.
 *
 * @param {string} profile - Current execution profile
 * @param {string} operation - Operation type (e.g., 'file_write', 'file_delete')
 * @returns {{ allowed: boolean, reason: string }}
 */
export function isWriteAllowed(profile, operation) {
  // Explore profile blocks ALL writes
  if (profile === Profile.EXPLORE) {
    return { allowed: false, reason: '[Article XVIII] Explore profile: read-only mode. No writes permitted.' };
  }

  // Always-confirm operations need user approval regardless of profile
  if (ALWAYS_CONFIRM_OPERATIONS.includes(operation)) {
    return { allowed: false, reason: `[Article XVIII] Operation "${operation}" always requires user confirmation.` };
  }

  // Guided profile: allowed but requires confirmation (caller handles confirmation)
  if (profile === Profile.GUIDED) {
    return { allowed: true, reason: 'Guided profile: confirmation required.' };
  }

  // Autonomous profile: allowed without confirmation
  if (profile === Profile.AUTONOMOUS) {
    return { allowed: true, reason: 'Autonomous profile: proceeding without confirmation.' };
  }

  return { allowed: true, reason: 'Default: allowed.' };
}

/**
 * Validate whether autonomous profile can be activated.
 *
 * @param {string} projectDir
 * @returns {{ canActivate: boolean, reason: string, currentScore: number }}
 */
export function canActivateAutonomous(projectDir) {
  const sessionPath = join(projectDir, '.chati', 'session.yaml');
  if (!existsSync(sessionPath)) {
    return { canActivate: false, reason: 'No active session', currentScore: 0 };
  }

  const raw = readFileSync(sessionPath, 'utf-8');

  // Look for most recent QA gate score
  const scoreMatches = raw.match(/score:\s*([\d.]+)/g);
  if (!scoreMatches || scoreMatches.length === 0) {
    return { canActivate: false, reason: 'No gate scores found. Run QA gates first.', currentScore: 0 };
  }

  const scores = scoreMatches.map((m) => parseFloat(m.replace('score:', '').trim()));
  const latestScore = scores[scores.length - 1];

  if (latestScore < AUTONOMOUS_GATE_THRESHOLD) {
    return {
      canActivate: false,
      reason: `Gate score ${latestScore}% < required ${AUTONOMOUS_GATE_THRESHOLD}%`,
      currentScore: latestScore,
    };
  }

  return { canActivate: true, reason: 'Gate scores meet threshold', currentScore: latestScore };
}

/**
 * Check if autonomous profile should be downgraded due to quality drop.
 *
 * @param {number} currentScore - Current quality score
 * @returns {{ shouldDowngrade: boolean, reason: string }}
 */
export function shouldDowngradeAutonomous(currentScore) {
  if (currentScore < AUTONOMOUS_GATE_THRESHOLD) {
    return {
      shouldDowngrade: true,
      reason: `Quality dropped to ${currentScore}% (< ${AUTONOMOUS_GATE_THRESHOLD}%). Auto-downgrading to guided profile.`,
    };
  }
  return { shouldDowngrade: false, reason: '' };
}
