import type { Challenge } from './game'

const DATA_URL = `${import.meta.env.BASE_URL}data/challenges.json`
const IMAGE_BASE_URL = `${import.meta.env.BASE_URL}images/`

type ChallengeFileRecord = Omit<Challenge, 'image'> & { image: string }

function isChallengeRecord(value: unknown): value is ChallengeFileRecord {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<ChallengeFileRecord>
  return typeof row.id === 'string'
    && typeof row.image === 'string'
    && typeof row.alt === 'string'
    && typeof row.caption === 'string'
    && typeof row.photoNote === 'string'
    && typeof row.title === 'string'
    && typeof row.category === 'string'
    && typeof row.date === 'string'
    && typeof row.lat === 'number'
    && Number.isFinite(row.lat)
    && typeof row.lng === 'number'
    && Number.isFinite(row.lng)
    && typeof row.place === 'string'
    && typeof row.description === 'string'
}

const LIVE_API = (import.meta.env.VITE_ADMIN_API_URL ?? '').trim().replace(/\/+$/, '')

async function fetchRecords(): Promise<{ rows: unknown; imageUrl: (path: string) => string }> {
  if (LIVE_API) {
    try {
      const live = await fetch(`${LIVE_API}/api/challenges`, { cache: 'no-store' })
      const body = live.ok ? await live.json() as { challenges?: unknown } : null
      if (Array.isArray(body?.challenges)) return { rows: body.challenges, imageUrl: (path) => `${LIVE_API}/api/images/${path.replace(/^images\//, '')}` }
    } catch {
      // Fall back to the files published with the site.
    }
  }
  const response = await fetch(DATA_URL, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`Could not load ${DATA_URL} (${response.status}).`)
  return { rows: await response.json(), imageUrl: (path) => `${IMAGE_BASE_URL}${path.replace(/^images\//, '')}` }
}

export async function loadChallenges(): Promise<Challenge[]> {
  const { rows, imageUrl } = await fetchRecords()
  if (!Array.isArray(rows)) throw new Error('The challenge JSON must contain an array of challenge records.')

  if (!rows.every(isChallengeRecord)) throw new Error('Every challenge needs id, image, alt, caption, photoNote, title, category, date, lat, lng, place, and description fields.')
  const ids = new Set<string>()
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error(`Challenge id “${row.id}” is duplicated.`)
    ids.add(row.id)
    if (!row.image.startsWith('images/') || row.image.includes('..')) throw new Error(`Challenge “${row.id}” must reference an image inside public/images/.`)
  }

  const playable = rows
    .filter((row) => row.active !== false)
    .map((row) => ({ ...row, image: imageUrl(row.image) }))

  // Never let a challenge with a missing photo reach players.
  const reachable = await Promise.all(playable.map(async (challenge) => {
    try {
      return (await fetch(challenge.image, { method: 'HEAD', cache: 'no-cache' })).ok
    } catch {
      return false
    }
  }))
  return playable.filter((challenge, index) => {
    if (!reachable[index]) console.warn(`Skipping challenge “${challenge.id}”: its photo is not available yet.`)
    return reachable[index]
  })
}
