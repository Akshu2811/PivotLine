import { NextResponse } from "next/server";
import { getStructuredCompletion } from "@/lib/ai/structuredCompletion";

/**
 * Sanity-check route: confirms the OpenAI connection and structured-output
 * helper work end to end. Not used by the app's real features.
 *
 * GET /api/test-ai
 */

const TEST_SCHEMA = {
  type: "object",
  properties: {
    greeting: { type: "string" },
    pivotTip: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["greeting", "pivotTip", "confidence"],
  additionalProperties: false,
};

export async function GET() {
  try {
    const result = await getStructuredCompletion<{
      greeting: string;
      pivotTip: string;
      confidence: number;
    }>({
      system:
        "You are a connection test for PivotLine, a voice-first career pivot coach. " +
        "Respond ONLY with JSON matching the schema.",
      prompt:
        "Say a short friendly greeting confirming the AI connection works, and give one " +
        "one-sentence tip for someone pivoting careers. Confidence is a number from 0 to 1.",
      schema: TEST_SCHEMA,
      schemaName: "test_ai_connection",
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
