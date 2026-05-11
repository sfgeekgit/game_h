#!/usr/bin/env node

import { mkdir, rename, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const args = {
    prompt: "",
    out: "generated-image.png",
    model: "gpt-image-1",
    size: "1024x1024",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--prompt" && argv[i + 1]) {
      args.prompt = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--out" && argv[i + 1]) {
      args.out = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--model" && argv[i + 1]) {
      args.model = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--size" && argv[i + 1]) {
      args.size = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node backend/scripts/generate-image.mjs --prompt "A cyberpunk owl" --out frontend/public/npcs/owl.png
  OPENAI_API_KEY=... node backend/scripts/generate-image.mjs --prompt "A cyberpunk owl" [--out frontend/public/npcs/owl.png] [--model gpt-image-1] [--size 1024x1024]

Options:
  --prompt   Required. Text prompt for image generation.
  --out      Output file path. Defaults to generated-image.png
  --model    Model name. Defaults to gpt-image-1
  --size     Image size. Defaults to 1024x1024
  --help     Show this message
`);
}

function loadDotEnvIfPresent() {
  const scriptPath = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(scriptPath);
  const backendDir = path.resolve(scriptDir, "..");
  const repoDir = path.resolve(backendDir, "..");
  const cwdDir = process.cwd();

  const envCandidates = [
    path.join(cwdDir, ".env"),
    path.join(backendDir, ".env"),
    path.join(repoDir, ".env"),
  ];

  const envPath = envCandidates.find((candidate, index) => {
    if (envCandidates.indexOf(candidate) !== index) {
      return false;
    }
    return existsSync(candidate);
  });
  if (!envPath) {
    return;
  }

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getBackupPath(filePath) {
  const parsed = path.parse(filePath);
  const basicBackup = path.join(parsed.dir, `${parsed.name}_old${parsed.ext}`);
  if (!existsSync(basicBackup)) {
    return basicBackup;
  }

  return path.join(parsed.dir, `${parsed.name}_old_${Date.now()}${parsed.ext}`);
}

async function writeWithBackup(filePath, imageBytes, label) {
  if (existsSync(filePath)) {
    const backupPath = getBackupPath(filePath);
    await rename(filePath, backupPath);
    console.log(`Existing ${label} moved to: ${backupPath}`);
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, imageBytes);
  console.log(`${label} written to: ${filePath}`);
}

function getDistMirrorPath(filePath) {
  const normalized = path.normalize(filePath);
  const publicSegment = `${path.sep}frontend${path.sep}public${path.sep}`;
  const idx = normalized.indexOf(publicSegment);
  if (idx === -1) {
    return null;
  }

  return `${normalized.slice(0, idx)}${path.sep}frontend${path.sep}dist${normalized.slice(
    idx + publicSegment.length - 1,
  )}`;
}

async function main() {
  if (process.argv.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  loadDotEnvIfPresent();

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!apiKey) {
    console.error(
      "Missing API key. Set OPENAI_API_KEY (or OPENAI_KEY), for example:\nexport OPENAI_API_KEY='your_api_key_here'",
    );
    process.exit(1);
  }

  const { prompt, out, model, size } = parseArgs(process.argv);

  if (!prompt) {
    console.error("Missing --prompt. Run with --help for usage.");
    process.exit(1);
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  const imageBase64 = payload?.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("No image data returned by API.");
  }

  const outputBaseDir = process.env.INIT_CWD || process.cwd();
  const outputPath = path.isAbsolute(out)
    ? out
    : path.resolve(outputBaseDir, out);
  const imageBytes = Buffer.from(imageBase64, "base64");
  const distMirrorPath = getDistMirrorPath(outputPath);

  await writeWithBackup(outputPath, imageBytes, "Public file");
  if (distMirrorPath) {
    await writeWithBackup(distMirrorPath, imageBytes, "Dist mirror");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
