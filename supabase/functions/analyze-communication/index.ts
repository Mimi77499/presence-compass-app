import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, speechMetrics, durationSeconds, promptContext } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert communication coach. Analyze the following speech data and return a JSON object with detailed communication metrics AND word-by-word analysis.

Given the transcript and speech metrics, evaluate and return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "eyeContact": { "score": <number 0-100>, "label": "<Good/Fair/Poor>", "feedback": "<1-2 sentence feedback>" },
  "fillerWords": { "count": <number>, "examples": ["<detected fillers>"], "feedback": "<1-2 sentence suggestion>" },
  "confidence": { "score": <number 0-100>, "factors": ["<factor1>", "<factor2>"], "feedback": "<1-2 sentence feedback>" },
  "speechClarity": { "score": <number 0-100>, "feedback": "<1-2 sentence feedback>" },
  "speakingPace": { "wpm": <number>, "label": "<Too Fast/Good/Too Slow>", "feedback": "<1-2 sentence feedback>" },
  "volumeStability": { "score": <number 0-100>, "feedback": "<1-2 sentence feedback>" },
  "focusScore": { "score": <number 0-100>, "feedback": "<1-2 sentence feedback>" },
  "facialEngagement": { "score": <number 0-100>, "feedback": "<1-2 sentence feedback>" },
  "pauseControl": { "longPauses": <number>, "feedback": "<1-2 sentence feedback>" },
  "posture": { "score": <number 0-100>, "feedback": "<1-2 sentence feedback>" },
  "overallScore": <number 0-100>,
  "suggestions": ["<suggestion1>", "<suggestion2>", "<suggestion3>", "<suggestion4>"],
  "wordAnalysis": [
    { "word": "<word>", "type": "<normal|filler|strong|weak|repetition>", "note": "<optional short note>" }
  ],
  "promptFeedback": "<If a guided prompt was given, 2-3 sentences evaluating how well the speaker addressed the prompt. null if no prompt.>"
}

WORD ANALYSIS RULES:
- Go through EVERY word in the transcript
- Mark filler words (um, uh, like, you know, basically, actually, literally, so, well, right, I mean, kind of, sort of) as "filler"
- Mark strong/confident words (clear verbs, specific nouns, impactful adjectives) as "strong"
- Mark weak/vague words (thing, stuff, maybe, just, I think, I guess, whatever, probably) as "weak"
- Mark words repeated excessively (3+ times in short span) as "repetition"
- Mark everything else as "normal"
- Add a short "note" for non-normal words explaining why it was flagged

Be realistic, honest, and constructive. Base analysis on the actual transcript.`;

    const promptInfo = promptContext
      ? `\nGuided Prompt: "${promptContext.title}" — ${promptContext.description} (Time limit: ${promptContext.timeLimit}s)`
      : "";

    const userPrompt = `Analyze this communication session:

Duration: ${durationSeconds} seconds${promptInfo}
Transcript: "${transcript || "(no speech detected)"}"

Speech Metrics:
- Word count: ${speechMetrics?.wordCount ?? 0}
- Estimated WPM: ${speechMetrics?.wpm ?? 0}
- Detected filler words: ${JSON.stringify(speechMetrics?.fillerWords ?? [])}
- Filler word count: ${speechMetrics?.fillerCount ?? 0}
- Average volume level: ${speechMetrics?.avgVolume ?? "unknown"}
- Volume variance: ${speechMetrics?.volumeVariance ?? "unknown"}
- Pause count (>2s): ${speechMetrics?.longPauses ?? 0}
- Speaking time ratio: ${speechMetrics?.speakingRatio ?? "unknown"}

Please provide a thorough and honest assessment with word-by-word analysis.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse analysis results");
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-communication error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
