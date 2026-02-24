import type { GPSLocation } from './determineTransition'

type RequiredGPSLocation = { lat: number; lng: number }

export function calcDistance(a: GPSLocation, b: RequiredGPSLocation): number {
  if (!a) return Infinity

  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * R * Math.asin(Math.sqrt(h))
}