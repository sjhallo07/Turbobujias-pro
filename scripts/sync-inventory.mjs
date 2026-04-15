import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const backendInventoryPath = path.join(repoRoot, 'backend', 'data', 'inventory.json');
const chatbotInventoryPath = path.join(repoRoot, 'turbobujias-ai', 'inventory.json');
const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check') || args.has('-c');

function readInventory(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
    throw new Error(`Inventory file at ${filePath} must contain an object with an items array.`);
  }

  return parsed;
}

function getSkuSet(inventory) {
  return new Set(
    inventory.items
      .map((item) => String(item?.sku || '').trim())
      .filter(Boolean)
  );
}

function findDuplicateSkus(inventory) {
  const counts = new Map();
  for (const item of inventory.items) {
    const sku = String(item?.sku || '').trim();
    if (!sku) {
      continue;
    }
    counts.set(sku, (counts.get(sku) || 0) + 1);
  }

  return [...counts.entries()].filter(([, count]) => count > 1).map(([sku]) => sku);
}

function ensureParity(sourceInventory, targetInventory) {
  const sourceSkus = getSkuSet(sourceInventory);
  const targetSkus = getSkuSet(targetInventory);

  if (sourceInventory.items.length !== targetInventory.items.length) {
    throw new Error(
      `Inventory count mismatch: backend=${sourceInventory.items.length}, chatbot=${targetInventory.items.length}.`
    );
  }

  const missingInTarget = [...sourceSkus].filter((sku) => !targetSkus.has(sku));
  const extraInTarget = [...targetSkus].filter((sku) => !sourceSkus.has(sku));

  if (missingInTarget.length || extraInTarget.length) {
    const parts = [];
    if (missingInTarget.length) {
      parts.push(`missing in chatbot: ${missingInTarget.slice(0, 10).join(', ')}`);
    }
    if (extraInTarget.length) {
      parts.push(`extra in chatbot: ${extraInTarget.slice(0, 10).join(', ')}`);
    }
    throw new Error(`SKU parity mismatch (${parts.join(' | ')}).`);
  }
}

function writeInventory(filePath, inventory) {
  fs.writeFileSync(filePath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
}

function main() {
  const backendInventory = readInventory(backendInventoryPath);
  const backendDuplicates = findDuplicateSkus(backendInventory);
  if (backendDuplicates.length) {
    throw new Error(`Backend inventory contains duplicate SKUs: ${backendDuplicates.slice(0, 10).join(', ')}`);
  }

  if (!checkOnly) {
    writeInventory(chatbotInventoryPath, backendInventory);
    console.log(`[sync] wrote chatbot inventory from backend source: ${chatbotInventoryPath}`);
  }

  const chatbotInventory = readInventory(chatbotInventoryPath);
  const chatbotDuplicates = findDuplicateSkus(chatbotInventory);
  if (chatbotDuplicates.length) {
    throw new Error(`Chatbot inventory contains duplicate SKUs: ${chatbotDuplicates.slice(0, 10).join(', ')}`);
  }

  ensureParity(backendInventory, chatbotInventory);
  console.log(
    `[sync] inventory parity OK | backend=${backendInventory.items.length} | chatbot=${chatbotInventory.items.length}`
  );
}

main();
