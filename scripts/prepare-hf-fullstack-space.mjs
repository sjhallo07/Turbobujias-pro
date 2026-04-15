import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, 'dist', 'hf-fullstack-space');
const templateDir = path.join(repoRoot, 'deploy', 'huggingface-fullstack-space');

const includePaths = [
  'backend',
  'turbobujias-web',
  'turbobujias-ai',
  path.join('deploy', 'huggingface-fullstack-space', 'Dockerfile'),
  path.join('deploy', 'huggingface-fullstack-space', 'README.md'),
  path.join('deploy', 'huggingface-fullstack-space', 'deploy_hf_fullstack_space.ipynb'),
  path.join('deploy', 'huggingface-fullstack-space', 'docker'),
];

const ignoredNames = new Set([
  '.git',
  '.next',
  'node_modules',
  '__pycache__',
  '.venv',
  '.venv313',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.env',
]);

function rmrf(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function mkdirp(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function shouldIgnore(entryPath) {
  const parts = entryPath.split(path.sep);
  return parts.some((part) => ignoredNames.has(part));
}

function copyRecursive(sourcePath, destinationPath) {
  const stats = fs.statSync(sourcePath);

  if (shouldIgnore(sourcePath)) {
    return;
  }

  if (stats.isDirectory()) {
    mkdirp(destinationPath);
    for (const entry of fs.readdirSync(sourcePath)) {
      copyRecursive(path.join(sourcePath, entry), path.join(destinationPath, entry));
    }
    return;
  }

  mkdirp(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

function main() {
  rmrf(outputDir);
  mkdirp(outputDir);

  for (const relativePath of includePaths) {
    const sourcePath = path.join(repoRoot, relativePath);
    const destinationRelative = relativePath.startsWith(path.join('deploy', 'huggingface-fullstack-space'))
      ? path.relative(templateDir, sourcePath)
      : relativePath;
    const destinationPath = path.join(outputDir, destinationRelative);
    copyRecursive(sourcePath, destinationPath);
  }

  console.log(`[hf-space] prepared Docker Space bundle at ${outputDir}`);
}

main();
