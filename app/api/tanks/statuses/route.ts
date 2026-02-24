import { NextResponse } from 'next/server'

const resolveFlaskBaseUrl = (): string => {
  const configured = process.env.FLASK_API_BASE_URL || process.env.NEXT_PUBLIC_FLASK_API_BASE_URL
  if (configured && configured.trim().length > 0) {
    return configured.replace(/\/$/, '')
  }

  return 'http://163.44.121.247:5000'
}

export async function GET() {
  const flaskBaseUrl = resolveFlaskBaseUrl()
  const endpoint = `${flaskBaseUrl}/api/tanks/statuses`
  console.log('[proxy] GET /api/tanks/statuses ->', endpoint)

  try {
    const upstream = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    console.log('[proxy] upstream status:', upstream.status)

    const text = await upstream.text()

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: `Upstream returned ${upstream.status}`,
          upstreamStatus: upstream.status,
          upstreamBody: text,
        },
        { status: upstream.status }
      )
    }

    try {
      const payload: unknown = JSON.parse(text)
      return NextResponse.json(payload, { status: 200 })
    } catch {
      return NextResponse.json(
        {
          error: 'Upstream response was not valid JSON',
          upstreamBody: text,
        },
        { status: 502 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error'
    console.log('[proxy] upstream fetch error:', message)
    return NextResponse.json(
      {
        error: 'Failed to reach Flask API from Next.js server',
        details: message,
        endpoint,
      },
      { status: 502 }
    )
  }
}