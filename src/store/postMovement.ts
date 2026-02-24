export async function postMovement(payload: Record<string, string[]>, token: string): Promise<unknown> {
  const res = await fetch('http://163.44.121.247:5000/api/movements', {
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