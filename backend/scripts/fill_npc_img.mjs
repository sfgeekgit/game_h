#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import yaml from "js-yaml";

const MAX_PER_RUN = 5;

function loadDotEnvIfPresent(repoDir, backendDir) {
  const envCandidates = [
    path.join(process.cwd(), ".env"),
    path.join(backendDir, ".env"),
    path.join(repoDir, ".env"),
  ];
  const seen = new Set();
  const envPath = envCandidates.find((candidate) => {
    if (seen.has(candidate)) {
      return false;
    }
    seen.add(candidate);
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

function getNpcDescription(npcData, npcId) {
  const look =
    typeof npcData?.dialogue?.look === "string"
      ? npcData.dialogue.look.trim()
      : "";
  if (look) {
    return `Please draw an attractive NPC portrait for a video game (${npcId}). ${look}`;
  }
  return `Please draw an attractive NPC portrait for a video game (${npcId}).`;
}

function runGenerateScript(backendDir, repoDir, prompt, outPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(backendDir, "scripts/generate-image.mjs"), "--prompt", prompt, "--out", outPath],
      {
        cwd: backendDir,
        stdio: "inherit",
        env: {
          ...process.env,
          INIT_CWD: repoDir,
        },
      },
    );

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`generate-image.mjs exited with code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  const scriptPath = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(scriptPath);
  const backendDir = path.resolve(scriptDir, "..");
  const repoDir = path.resolve(backendDir, "..");

  loadDotEnvIfPresent(repoDir, backendDir);
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!apiKey) {
    console.error(
      "Missing API key. Set OPENAI_API_KEY (or OPENAI_KEY) in /home/game_h/.env before running fill_npc_img.",
    );
    process.exit(1);
  }

  const promptTemplatePath = path.join(repoDir, "docs/npc_img_prompt.txt");
  const promptTemplate = await readFile(promptTemplatePath, "utf8");
  const promptLines = promptTemplate.split(/\r?\n/);
  if (promptLines.length < 2) {
    throw new Error(`Prompt template is malformed: ${promptTemplatePath}`);
  }
  const promptTail = promptLines.slice(1).join("\n");

  const npcDir = path.join(repoDir, "text_content/npcs");
  const outputDir = path.join(repoDir, "frontend/public/npcs");
  const npcFiles = (await readdir(npcDir))
    .filter((name) => name.endsWith(".yaml"))
    .sort((a, b) => a.localeCompare(b));

  const queue = [];
  for (const fileName of npcFiles) {
    const npcId = path.basename(fileName, ".yaml");
    const outputPath = path.join(outputDir, `${npcId}.png`);
    if (existsSync(outputPath)) {
      continue;
    }
    queue.push({ npcId, fileName, outputPath });
    if (queue.length >= MAX_PER_RUN) {
      break;
    }
  }

  if (queue.length === 0) {
    console.log("No missing NPC images found. Nothing to generate.");
    return;
  }

  console.log(`Generating ${queue.length} NPC image(s), one at a time (max ${MAX_PER_RUN} per run).`);
  for (const item of queue) {
    const npcYamlPath = path.join(npcDir, item.fileName);
    const raw = await readFile(npcYamlPath, "utf8");
    const npcData = yaml.load(raw);
    const firstLine = getNpcDescription(npcData, item.npcId);
    const fullPrompt = `${firstLine}\n${promptTail}`;

    console.log(`\n[${item.npcId}] -> ${item.outputPath}`);
    console.log("Prompt:");
    console.log(fullPrompt);
    console.log("---");
    await runGenerateScript(backendDir, repoDir, fullPrompt, item.outputPath);
  }

  console.log("\nfill_npc_img complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
