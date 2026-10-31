import OpenAI from "openai";

/**
 * Server-only OpenAI helper. Never import this from a client component —
 * it reads OPENAI_API_KEY from process.env and will throw if called in the browser.
 *
 * All AI calls in PivotLine must go through this helper (or a route that calls it)
 * so every response is structured, validated JSON and the key never reaches the client.
 */

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (typeof window !== "undefined") {
    throw new Error(
      "structuredCompletion must only be called on the server (API routes / server components)."
    );
  }
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.startsWith("sk-REPLACE_ME")) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add your key to .env.local and restart the dev server."
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

export interface StructuredCompletionOptions {
  /** System / instructions prompt describing the task and constraints. */
  system: string;
  /** The user-facing prompt / content to process. */
  prompt: string;
  /** A JSON Schema (draft-07-ish, OpenAI structured-outputs flavor) describing the expected shape. */
  schema: Record<string, unknown>;
  /** A short name for the schema, used by the API for logging/caching. */
  schemaName: string;
  /** Override the default model. */
  model?: string;
  /** Sampling temperature. Defaults to 0.3 for consistent, structured results. */
  temperature?: number;
}

export interface StructuredCompletionResult<T> {
  data: T;
  retried: boolean;
  raw: string;
}

/**
 * Calls OpenAI with JSON-schema structured outputs and returns parsed, validated JSON.
 * If parsing fails (malformed JSON or a schema violation reported by the SDK), it retries
 * once with a stricter reminder appended to the prompt. Throws if the retry also fails.
 */
export async function getStructuredCompletion<T = unknown>(
  options: StructuredCompletionOptions
): Promise<StructuredCompletionResult<T>> {
  const { system, prompt, schema, schemaName, model, temperature } = options;
  const openai = getClient();
  const resolvedModel = model || DEFAULT_MODEL;

  const attempt = async (extraInstruction?: string): Promise<string> => {
    const response = await openai.responses.create({
      model: resolvedModel,
      temperature: temperature ?? 0.3,
      instructions: extraInstruction ? `${system}\n\n${extraInstruction}` : system,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          schema,
          strict: true,
        },
      },
    });

    const text = response.output_text;
    if (!text) {
      throw new Error("OpenAI response did not contain output_text.");
    }
    return text;
  };

  let raw: string;
  let retried = false;

  try {
    raw = await attempt();
    return { data: JSON.parse(raw) as T, retried, raw };
  } catch (firstError) {
    retried = true;
    try {
      raw = await attempt(
        "Your previous response could not be parsed as valid JSON matching the schema. " +
          "Return ONLY valid JSON that strictly matches the provided schema, with no extra text."
      );
      return { data: JSON.parse(raw) as T, retried, raw };
    } catch (secondError) {
      throw new Error(
        `Structured completion failed after 1 retry. First error: ${
          firstError instanceof Error ? firstError.message : String(firstError)
        }. Second error: ${
          secondError instanceof Error ? secondError.message : String(secondError)
        }`
      );
    }
  }
}
