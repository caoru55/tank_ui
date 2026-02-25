export async function postMovement(
  payload: Record<string, string[]>,
  token: string
): Promise<unknown> {
  // --- GPS を取得 ---
  const gps = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }),
      (err) => reject(err),
      { enableHighAccuracy: true }
    )
  })

  const extendedPayload = {
    ...payload,
    gps_lat: gps.lat,
    gps_lng: gps.lng,
  }

  const res = await fetch('/api/movements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(extendedPayload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Movements API error: ${res.status} ${text}`)
  }

  return res.json()
}
