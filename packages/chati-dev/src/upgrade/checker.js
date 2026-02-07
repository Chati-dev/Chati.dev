import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import semver from 'semver';

/**
 * Read current installed version from config.yaml
 */
export function getCurrentVersion(targetDir) {
  const configPath = join(targetDir, 'chati.dev', 'config.yaml');
  if (!existsSync(configPath)) return null;

  try {
    const config = yaml.load(readFileSync(configPath, 'utf-8'));
    return config?.version || null;
  } catch {
    return null;
  }
}

/**
 * Check for available updates
 * In v1, this compares against the CLI package version
 * Future versions will query npm registry or GitHub releases
 */
export async function checkForUpdate(targetDir, cliVersion) {
  const currentVersion = getCurrentVersion(targetDir);

  if (!currentVersion) {
    return {
      hasUpdate: false,
      error: 'Could not read current version from chati.dev/config.yaml',
    };
  }

  if (!semver.valid(currentVersion)) {
    return {
      hasUpdate: false,
      error: `Invalid version in config.yaml: ${currentVersion}`,
    };
  }

  const latestVersion = cliVersion; // In v1, latest = CLI version

  if (semver.gt(latestVersion, currentVersion)) {
    return {
      hasUpdate: true,
      currentVersion,
      latestVersion,
      changes: getChangelog(currentVersion, latestVersion),
    };
  }

  return {
    hasUpdate: false,
    currentVersion,
    latestVersion,
    message: 'You are on the latest version.',
  };
}

/**
 * Get changelog between versions
 * In v1, returns placeholder. Future: read from CHANGELOG.md or API
 */
function getChangelog(fromVersion, toVersion) {
  return [
    `Changes from v${fromVersion} to v${toVersion}:`,
    '  Check release notes for details.',
  ];
}

/**
 * Update config.yaml with the new version after successful upgrade
 */
export function updateConfigVersion(targetDir, newVersion) {
  const configPath = join(targetDir, 'chati.dev', 'config.yaml');
  if (!existsSync(configPath)) return false;

  try {
    const config = yaml.load(readFileSync(configPath, 'utf-8'));
    config.version = newVersion;
    writeFileSync(configPath, yaml.dump(config, { lineWidth: -1 }), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Compare two versions
 */
export function compareVersions(current, target) {
  if (!semver.valid(current) || !semver.valid(target)) {
    return { valid: false, error: 'Invalid version format' };
  }

  return {
    valid: true,
    isUpgrade: semver.gt(target, current),
    isDowngrade: semver.lt(target, current),
    isSame: semver.eq(target, current),
    diff: semver.diff(target, current), // 'major', 'minor', 'patch'
  };
}
