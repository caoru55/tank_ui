export async function postMovement(
  payload: Record<string, unknown>,
  token: string
): Promise<unknown> {
  const res = await fetch('/api/movements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Movements API error: ${res.status} ${text}`)
  }

  return res.json()
}
