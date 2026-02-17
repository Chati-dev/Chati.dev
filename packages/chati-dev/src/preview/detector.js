/**
 * @fileoverview Framework and dev command detection for User Preview.
 * Analyzes the project directory to determine what dev server to run.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Framework detection rules (checked in priority order).
 * Framework-specific config files take precedence over generic package.json scripts.
 */
const FRAMEWORK_DETECTORS = [
  {
    files: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    framework: 'nextjs',
    defaultPort: 3000,
    kind: 'fullstack',
  },
  {
    files: ['nuxt.config.js', 'nuxt.config.ts'],
    framework: 'nuxt',
    defaultPort: 3000,
    kind: 'fullstack',
  },
  {
    files: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'],
    framework: 'vite',
    defaultPort: 5173,
    kind: 'frontend',
  },
  {
    files: ['angular.json'],
    framework: 'angular',
    defaultPort: 4200,
    kind: 'frontend',
  },
  {
    files: ['svelte.config.js'],
    framework: 'sveltekit',
    defaultPort: 5173,
    kind: 'frontend',
  },
  {
    files: ['astro.config.mjs', 'astro.config.ts'],
    framework: 'astro',
    defaultPort: 4321,
    kind: 'frontend',
  },
  {
    files: ['manage.py'],
    framework: 'django',
    defaultPort: 8000,
    kind: 'fullstack',
  },
];

/**
 * API framework packages — if found in dependencies, the project is an API.
 */
const API_PACKAGES = ['express', 'fastify', 'koa', 'hapi', 'nest', '@nestjs/core', 'restify'];

/**
 * Preferred npm script names in priority order.
 */
const SCRIPT_PRIORITY = ['dev', 'start', 'serve', 'preview'];

/**
 * Detect the dev command for a project.
 *
 * Detection priority:
 *   1. Framework-specific config files (next.config.*, vite.config.*, etc.)
 *   2. package.json scripts (dev > start > serve > preview)
 *   3. Static index.html fallback (npx serve .)
 *   4. null if nothing detected (CLI tools, libraries)
 *
 * @param {string} projectDir - Absolute path to the project root
 * @returns {{ command: string, args: string[], description: string, framework: string, defaultPort: number } | null}
 */
export function detectDevCommand(projectDir) {
  // 1. Framework-specific config files
  for (const detector of FRAMEWORK_DETECTORS) {
    if (detector.files.some((f) => existsSync(join(projectDir, f)))) {
      return resolveFrameworkCommand(projectDir, detector);
    }
  }

  // 2. package.json scripts
  const pkgPath = join(projectDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const scripts = pkg.scripts || {};

      for (const script of SCRIPT_PRIORITY) {
        if (scripts[script]) {
          const defaultPort = 3000;
          const command = script === 'start' ? 'npm' : 'npm';
          const args = script === 'start' ? ['start'] : ['run', script];

          return {
            command,
            args,
            description: script === 'start' ? 'npm start' : `npm run ${script}`,
            framework: 'node',
            defaultPort,
          };
        }
      }
    } catch {
      // Invalid package.json — skip
    }
  }

  // 3. Static index.html fallback
  if (existsSync(join(projectDir, 'index.html'))) {
    return {
      command: 'npx',
      args: ['serve', '.'],
      description: 'Static file server (npx serve)',
      framework: 'static',
      defaultPort: 3000,
    };
  }

  // 4. Nothing detected
  return null;
}

/**
 * Detect the kind of project for UX messaging.
 *
 * @param {string} projectDir - Absolute path to the project root
 * @returns {'frontend'|'api'|'fullstack'|'cli'|'library'|'static'}
 */
export function detectProjectKind(projectDir) {
  // Check framework-specific configs first
  for (const detector of FRAMEWORK_DETECTORS) {
    if (detector.files.some((f) => existsSync(join(projectDir, f)))) {
      return detector.kind;
    }
  }

  // Check package.json for API framework deps
  const pkgPath = join(projectDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      if (API_PACKAGES.some((p) => allDeps[p])) {
        return 'api';
      }

      // Has bin field → CLI tool
      if (pkg.bin) {
        return 'cli';
      }

      // Has main/exports but no scripts → library
      if ((pkg.main || pkg.exports) && !pkg.scripts?.dev && !pkg.scripts?.start) {
        return 'library';
      }
    } catch {
      // Invalid package.json
    }
  }

  // Static HTML
  if (existsSync(join(projectDir, 'index.html'))) {
    return 'static';
  }

  // Python projects
  if (existsSync(join(projectDir, 'manage.py'))) {
    return 'fullstack';
  }

  // Default: assume library/CLI (no preview server)
  return 'library';
}

/**
 * Resolve the dev command for a known framework.
 *
 * @param {string} projectDir
 * @param {object} detector - Framework detector entry
 * @returns {{ command: string, args: string[], description: string, framework: string, defaultPort: number }}
 */
function resolveFrameworkCommand(projectDir, detector) {
  const { framework, defaultPort } = detector;

  // Django has its own command
  if (framework === 'django') {
    return {
      command: 'python',
      args: ['manage.py', 'runserver'],
      description: 'Django dev server',
      framework,
      defaultPort,
    };
  }

  // Node-based frameworks: prefer package.json scripts
  const pkgPath = join(projectDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const scripts = pkg.scripts || {};

      for (const script of SCRIPT_PRIORITY) {
        if (scripts[script]) {
          return {
            command: 'npm',
            args: script === 'start' ? ['start'] : ['run', script],
            description: `${framework} (npm ${script === 'start' ? 'start' : `run ${script}`})`,
            framework,
            defaultPort,
          };
        }
      }
    } catch {
      // Fall through to default
    }
  }

  // Fallback for Node frameworks without scripts
  return {
    command: 'npm',
    args: ['run', 'dev'],
    description: `${framework} dev server`,
    framework,
    defaultPort,
  };
}
