#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const configDir = path.join(repoRoot, "apps", "web", "elevenlabs");

const API_BASE_URL = "https://api.elevenlabs.io/v1";

function hasFlag(name) {
  return process.argv.includes(name);
}

async function loadRootEnv() {
  const envPath = path.join(repoRoot, ".env");
  const raw = await readFile(envPath, "utf8").catch(() => "");
  if (!raw) return;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

function buildPayload({ agentConfig, prompt, toolIds }) {
  return {
    name: agentConfig.name,
    tags: agentConfig.tags,
    conversation_config: {
      agent: {
        first_message: agentConfig.first_message,
        language: agentConfig.language,
        prompt: {
          prompt: prompt.trim(),
          llm: agentConfig.llm,
          temperature: agentConfig.temperature,
          max_tokens: agentConfig.max_tokens,
          tool_ids: toolIds,
          mcp_server_ids: [],
          native_mcp_server_ids: [],
          knowledge_base: [],
        },
      },
      turn: agentConfig.turn,
      tts: agentConfig.tts,
    },
  };
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getErrorMessage(body, fallback) {
  if (typeof body?.detail === "string") return body.detail;
  if (typeof body?.detail?.message === "string") return body.detail.message;
  if (typeof body?.message === "string") return body.message;
  if (typeof body?.error === "string") return body.error;
  return fallback;
}

async function elevenLabsRequest({ apiKey, body, method, path }) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        responseBody,
        `ElevenLabs ${method} ${path} failed with ${response.status}`,
      ),
    );
  }

  return responseBody;
}

async function listTools(apiKey) {
  const body = await elevenLabsRequest({
    apiKey,
    method: "GET",
    path: "/convai/tools",
  });
  return Array.isArray(body.tools) ? body.tools : [];
}

async function upsertTools({ apiKey, tools }) {
  const existingTools = await listTools(apiKey);
  const existingByName = new Map(
    existingTools
      .map((tool) => [tool?.tool_config?.name, tool])
      .filter(([name]) => typeof name === "string"),
  );
  const toolIds = [];

  for (const tool of tools) {
    const existing = existingByName.get(tool.name);
    const { response_mocks: responseMocks = [], ...toolConfig } = tool;
    const body = { tool_config: toolConfig, response_mocks: responseMocks };

    if (existing?.id) {
      const updated = await elevenLabsRequest({
        apiKey,
        method: "PATCH",
        path: `/convai/tools/${existing.id}`,
        body,
      });
      toolIds.push(updated.id ?? existing.id);
      continue;
    }

    const created = await elevenLabsRequest({
      apiKey,
      method: "POST",
      path: "/convai/tools",
      body,
    });
    toolIds.push(created.id);
  }

  return toolIds;
}

async function sendToElevenLabs({ agentId, apiKey, payload }) {
  const isUpdate = Boolean(agentId);
  const path = isUpdate
    ? `/convai/agents/${agentId}`
    : "/convai/agents/create";
  return elevenLabsRequest({
    apiKey,
    method: isUpdate ? "PATCH" : "POST",
    path,
    body: payload,
  });
}

async function main() {
  const dryRun = hasFlag("--dry-run") || hasFlag("--diff");
  const allowCreate = !hasFlag("--no-create");

  await loadRootEnv();

  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  const [agentConfig, prompt, tools] = await Promise.all([
    readJson(path.join(configDir, "chef-cooking-copilot.agent.json")),
    readText(path.join(configDir, "chef-cooking-copilot.prompt.md")),
    readJson(path.join(configDir, "chef-cooking-copilot.tools.json")),
  ]);

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          tool_names_to_sync: tools.map((tool) => tool.name),
          agent_payload_template: buildPayload({
            agentConfig,
            prompt,
            toolIds: tools.map((tool) => `<${tool.name}_tool_id>`),
          }),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is required.");
  }

  if (!agentId && !allowCreate) {
    throw new Error(
      "ELEVENLABS_AGENT_ID is required when running with --no-create.",
    );
  }

  const toolIds = await upsertTools({ apiKey, tools });
  const payload = buildPayload({ agentConfig, prompt, toolIds });
  const result = await sendToElevenLabs({ agentId, apiKey, payload });
  const nextAgentId = result.agent_id ?? agentId;

  if (agentId) {
    console.log(`Updated ElevenLabs agent ${agentId}.`);
  } else {
    console.log(`Created ElevenLabs agent ${nextAgentId}.`);
    console.log("Add this to root .env and Vercel web env:");
    console.log(`ELEVENLABS_AGENT_ID=${nextAgentId}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
