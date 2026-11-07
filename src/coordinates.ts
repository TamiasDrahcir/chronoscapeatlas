const ANGLE = String.raw`([+-]?\d+(?:\.\d+)?)\s*°?\s*(?:(\d+(?:\.\d+)?)\s*')?\s*(?:(\d+(?:\.\d+)?)\s*")?`
const SEPARATOR = String.raw`(?:\s*,\s*|\s+)`
const PREFIXED = new RegExp(String.raw`^([NSEW])\s*${ANGLE}${SEPARATOR}([NSEW])\s*${ANGLE}$`, 'i')
const SUFFIXED = new RegExp(String.raw`^${ANGLE}\s*([NSEW])?${SEPARATOR}${ANGLE}\s*([NSEW])?$`, 'i')

function toDegrees(sign: string, degrees: string, minutes: string | undefined, seconds: string | undefined, hemisphere: string | undefined, positive: string, negative: string, limit: number): number | null {
	const wholeDegrees = !degrees.includes('.')
	if (minutes !== undefined && (!wholeDegrees || Number(minutes) >= 60)) return null
	if (seconds !== undefined && (minutes === undefined || minutes.includes('.') || Number(seconds) >= 60)) return null
	const magnitude = Number(degrees) + Number(minutes ?? 0) / 60 + Number(seconds ?? 0) / 3600
	const letter = hemisphere?.toUpperCase()
	if (letter && letter !== positive && letter !== negative) return null
	const value = sign === '-' || letter === negative ? -magnitude : magnitude
	return Math.abs(value) <= limit ? value : null
}

// Accepts "lat, long", "lat,long", optionally wrapped in parentheses, in decimal or degrees/minutes/seconds form.
export function parseCoordinates(text: string): { lat: number; lng: number } | null {
	let input = text.trim()
	const wrapped = /^\(\s*([\s\S]*?)\s*\)$/.exec(input)
	if (wrapped) input = wrapped[1]
	input = input.replace(/[′’‘ʹ´`]/g, "'").replace(/[″”“]/g, '"').replace(/''/g, '"').replace(/[º˚]/g, '°')

	const prefixed = PREFIXED.exec(input)
	const suffixed = prefixed ? null : SUFFIXED.exec(input)
	let parts: [string | undefined, string, string | undefined, string | undefined, string | undefined, string, string | undefined, string | undefined]
	if (prefixed) {
		const [, latHemisphere, latDegrees, latMinutes, latSeconds, lngHemisphere, lngDegrees, lngMinutes, lngSeconds] = prefixed
		parts = [latHemisphere, latDegrees, latMinutes, latSeconds, lngHemisphere, lngDegrees, lngMinutes, lngSeconds]
	} else if (suffixed) {
		const [, latDegrees, latMinutes, latSeconds, latHemisphere, lngDegrees, lngMinutes, lngSeconds, lngHemisphere] = suffixed
		parts = [latHemisphere, latDegrees, latMinutes, latSeconds, lngHemisphere, lngDegrees, lngMinutes, lngSeconds]
	} else return null

	const [latHemisphere, latDegrees, latMinutes, latSeconds, lngHemisphere, lngDegrees, lngMinutes, lngSeconds] = parts
	const lat = toDegrees(latDegrees.startsWith('-') ? '-' : '', latDegrees.replace(/^[+-]/, ''), latMinutes, latSeconds, latHemisphere, 'N', 'S', 90)
	const lng = toDegrees(lngDegrees.startsWith('-') ? '-' : '', lngDegrees.replace(/^[+-]/, ''), lngMinutes, lngSeconds, lngHemisphere, 'E', 'W', 180)
	return lat === null || lng === null ? null : { lat, lng }
}

export const formatCoordinates = (lat: number, lng: number) => `(${lat.toFixed(6)}, ${lng.toFixed(6)})`
