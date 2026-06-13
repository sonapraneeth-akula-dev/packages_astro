import { spawn, execSync } from 'node:child_process';

/**
 * Helper script to retrieve Git metadata from the host and pass it to Docker
 * Compose as environment variables. This ensures the correct Git commit and
 * branch are baked into the built images without needing the .git folder in the
 * Docker build context.
 */
function getGitInfo() {
  let commit = 'unknown';
  let branch = 'unknown';
  try {
    commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    commit = process.env.GIT_COMMIT ?? 'unknown';
  }
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    branch = process.env.GIT_BRANCH ?? 'unknown';
  }
  return { commit, branch };
}

const { commit, branch } = getGitInfo();
const args = process.argv.slice(2);

console.log(`[Docker Compose Helper] Injecting Git Metadata: ${commit}@${branch}`);

const child = spawn('docker', ['compose', ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    GIT_COMMIT: commit,
    GIT_BRANCH: branch,
  },
  shell: process.platform === 'win32',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
