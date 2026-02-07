import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Auto-detect project type (greenfield vs brownfield)
 * Brownfield signals: package.json, src/, .git/, etc.
 */
export function detectProjectType(targetDir) {
  const signals = {
    packageJson: existsSync(join(targetDir, 'package.json')),
    srcDir: existsSync(join(targetDir, 'src')),
    gitDir: existsSync(join(targetDir, '.git')),
    composerJson: existsSync(join(targetDir, 'composer.json')),
    requirementsTxt: existsSync(join(targetDir, 'requirements.txt')),
    goMod: existsSync(join(targetDir, 'go.mod')),
    cargoToml: existsSync(join(targetDir, 'Cargo.toml')),
    pomXml: existsSync(join(targetDir, 'pom.xml')),
  };

  const brownfieldSignals = Object.values(signals).filter(Boolean).length;

  return {
    suggestion: brownfieldSignals >= 2 ? 'brownfield' : 'greenfield',
    signals,
    confidence: brownfieldSignals >= 2 ? 'high' : brownfieldSignals === 1 ? 'medium' : 'low',
  };
}

/**
 * Detect currently installed IDEs by checking common paths/commands
 */
export function detectInstalledIDEs() {
  const detected = [];

  // Claude Code - check if claude CLI exists
  if (existsSync('/usr/local/bin/claude') || existsSync(join(process.env.HOME || '', '.claude'))) {
    detected.push('claude-code');
  }

  // VS Code - check .vscode or code command
  if (existsSync(join(process.env.HOME || '', '.vscode'))) {
    detected.push('vscode');
  }

  // Cursor
  if (existsSync(join(process.env.HOME || '', '.cursor'))) {
    detected.push('cursor');
  }

  return detected;
}
