// Vercel serverless (Edge) function that proxies practice generation to the
// OpenAI API. The secret OPENAI_API_KEY stays server-side and is never shipped
// in the client bundle; the Vite app calls POST /api/generate-practice with a
// prompt and gets back the model's raw JSON text for the client to parse.
//
// SECURITY NOTE: this endpoint spends your OpenAI quota and currently has no
// caller authentication (matching the app's test-mode posture). Before a real
// launch, require a verified Firebase ID token and/or add rate limiting.

export const config = { runtime: 'edge' }

// Read environment variables without depending on @types/node: Vercel's function
// compiler doesn't always have the `process` global typed, so access it through
// a narrowly-typed globalThis. `process.env` exists at runtime in both the Node
// and Edge runtimes.
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {}

const SYSTEM_INSTRUCTION =
  'You are a careful physics tutor generating short numeric retrieval-practice problems for an interactive lesson app. Use accurate physics, simple numbers, and exactly one numeric answer per problem. Respond with a single JSON object and nothing else.'

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) {
    return json({ error: 'Server is missing OPENAI_API_KEY.' }, 500)
  }

  let prompt: string
  try {
    const body = (await req.json()) as { prompt?: unknown }
    if (typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
      return json({ error: 'Request body must include a non-empty "prompt".' }, 400)
    }
    prompt = body.prompt
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const model = env.OPENAI_MODEL ?? 'gpt-4o-mini'

  let openaiRes: Response
  try {
    openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: prompt },
        ],
      }),
    })
  } catch (error) {
    return json(
      { error: `Could not reach OpenAI: ${(error as Error).message}` },
      502,
    )
  }

  if (!openaiRes.ok) {
    const detail = await openaiRes.text().catch(() => '')
    return json(
      { error: `OpenAI request failed (${openaiRes.status}).`, detail },
      openaiRes.status,
    )
  }

  const data = (await openaiRes.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) {
    return json({ error: 'OpenAI returned an empty response.' }, 502)
  }

  return json({ text }, 200)
}
