import { NextRequest, NextResponse } from 'next/server'

interface PestResult {
  pest: string
  confidence: 'high' | 'medium' | 'low'
  description: string
  fix: string
  urgency: 'low' | 'medium' | 'high'
  fallback?: boolean
}

function getFallback(): PestResult {
  return {
    pest: 'Unable to identify',
    confidence: 'low',
    description: 'AI identification is unavailable right now. Check the pest guide below for common NZ garden problems.',
    fix: 'Inspect leaves closely for insects, eggs, or damage patterns. Remove affected foliage and consider organic sprays.',
    urgency: 'low',
    fallback: true,
  }
}

export async function POST(request: NextRequest) {
  let description = ''
  let crops: string[] = []

  try {
    const body = await request.json()
    description = body.description || ''
    crops = body.crops || []
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!description.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    return NextResponse.json(getFallback())
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: `You are a New Zealand vegetable garden pest and disease expert. Given a description of a plant problem, identify the most likely cause common in NZ gardens. Always respond with valid JSON only — no markdown, no extra text. Format: {"pest":"name","confidence":"high|medium|low","description":"1-2 sentence description","fix":"practical organic control in 1-2 sentences","urgency":"low|medium|high"}`,
        messages: [
          {
            role: 'user',
            content: `My crops: ${crops.length > 0 ? crops.join(', ') : 'vegetables and berries'}\n\nProblem description: ${description}`,
          },
        ],
      }),
    })

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`)

    const data = await response.json()
    const text = (data.content[0] as { text: string }).text.trim()

    // Strip any accidental markdown fences
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const result: PestResult = JSON.parse(cleaned)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(getFallback())
  }
}
