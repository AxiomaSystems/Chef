import assert from "node:assert/strict";
import test from "node:test";
import {
  getWebFeatureReadiness,
  validateWebEnvironment,
} from "./feature-readiness.mts";

test("requires an explicit API URL for production", () => {
  assert.throws(
    () => validateWebEnvironment({ NODE_ENV: "production" }),
    /API_BASE_URL is required in production/,
  );
});

test("rejects an HTTP API URL for production", () => {
  const environment = {
    NODE_ENV: "production" as const,
    API_BASE_URL: "http://api.example.com/api/v1",
  };

  assert.equal(getWebFeatureReadiness(environment).api.status, "misconfigured");
  assert.throws(() => validateWebEnvironment(environment), /API_BASE_URL/);
});

for (const apiBaseUrl of [
  "https://localhost.:3001/api/v1",
  "https://127.0.0.2:3001/api/v1",
  "https://[::1]:3001/api/v1",
  "https://[::ffff:127.0.0.1]:3001/api/v1",
]) {
  test(`rejects production loopback API URL ${apiBaseUrl}`, () => {
    const environment = {
      NODE_ENV: "production" as const,
      API_BASE_URL: apiBaseUrl,
    };

    assert.equal(
      getWebFeatureReadiness(environment).api.status,
      "misconfigured",
    );
    assert.throws(() => validateWebEnvironment(environment), /API_BASE_URL/);
  });
}

test("reports a complete conversational ElevenLabs bundle as ready", () => {
  const readiness = getWebFeatureReadiness({
    NODE_ENV: "production",
    API_BASE_URL: "https://api.example.com/api/v1",
    ELEVENLABS_API_KEY: "secret-api-key",
    ELEVENLABS_AGENT_ID: "server-agent-id",
    NEXT_PUBLIC_ELEVENLABS_AGENT_ID: "public-agent-id",
  });

  assert.deepEqual(readiness.voice, {
    status: "ready",
    capabilities: {
      conversationalAgent: {
        status: "ready",
        environment: [
          "ELEVENLABS_AGENT_ID",
          "NEXT_PUBLIC_ELEVENLABS_AGENT_ID",
          "ELEVENLABS_API_KEY",
        ],
      },
      speechToText: {
        status: "ready",
        environment: ["ELEVENLABS_API_KEY"],
      },
      textToSpeech: {
        status: "disabled",
        environment: ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"],
      },
    },
  });
});

test("reports partial conversational voice configuration as misconfigured", () => {
  const readiness = getWebFeatureReadiness({
    NODE_ENV: "test",
    ELEVENLABS_AGENT_ID: "server-agent-id",
  });

  assert.equal(readiness.voice.status, "misconfigured");
  assert.equal(
    readiness.voice.capabilities.conversationalAgent.status,
    "misconfigured",
  );
  assert.equal(readiness.voice.capabilities.speechToText.status, "disabled");
  assert.equal(readiness.voice.capabilities.textToSpeech.status, "disabled");
  assert.throws(
    () =>
      validateWebEnvironment({
        NODE_ENV: "production",
        API_BASE_URL: "https://api.example.com/api/v1",
        ELEVENLABS_AGENT_ID: "server-agent-id",
      }),
    /ELEVENLABS_AGENT_ID, NEXT_PUBLIC_ELEVENLABS_AGENT_ID, and ELEVENLABS_API_KEY/,
  );
});

test("allows an API key as a ready STT-only configuration", () => {
  const readiness = getWebFeatureReadiness({
    NODE_ENV: "test",
    ELEVENLABS_API_KEY: "secret-api-key",
  });

  assert.equal(readiness.voice.status, "ready");
  assert.equal(
    readiness.voice.capabilities.conversationalAgent.status,
    "disabled",
  );
  assert.equal(readiness.voice.capabilities.speechToText.status, "ready");
  assert.equal(readiness.voice.capabilities.textToSpeech.status, "disabled");
});

test("allows production builds with no optional voice configuration", () => {
  assert.doesNotThrow(() =>
    validateWebEnvironment({
      NODE_ENV: "production",
      API_BASE_URL: "https://api.example.com/api/v1",
    }),
  );
});

test("enables TTS only when a voice ID accompanies the API key", () => {
  const readiness = getWebFeatureReadiness({
    NODE_ENV: "test",
    ELEVENLABS_API_KEY: "secret-api-key",
    ELEVENLABS_VOICE_ID: "voice-id",
  });

  assert.equal(readiness.voice.status, "ready");
  assert.equal(readiness.voice.capabilities.speechToText.status, "ready");
  assert.equal(readiness.voice.capabilities.textToSpeech.status, "ready");
});

test("reports a voice ID without an API key as misconfigured", () => {
  const environment = {
    NODE_ENV: "production" as const,
    API_BASE_URL: "https://api.example.com/api/v1",
    ELEVENLABS_VOICE_ID: "voice-id",
  };
  const readiness = getWebFeatureReadiness(environment);

  assert.equal(readiness.voice.status, "misconfigured");
  assert.equal(
    readiness.voice.capabilities.textToSpeech.status,
    "misconfigured",
  );
  assert.throws(
    () => validateWebEnvironment(environment),
    /ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID/,
  );
});
