import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

const METRICS_VISITS_KEY = 'metrics:visits'
const METRICS_INSTALLS_KEY = 'metrics:installs'

function envFlag(name: string, defaultValue: boolean) {
  const value = process.env[name]
  if (value === undefined) return defaultValue
  return value === '1' || value.toLowerCase() === 'true'
}

export function metricsEnabled() {
  return envFlag('METRICS_ENABLED', true)
}

export async function incrementVisit() {
  return redis.incr(METRICS_VISITS_KEY)
}

export async function incrementInstall() {
  return redis.incr(METRICS_INSTALLS_KEY)
}

export async function getMetrics() {
  const [visits, installs] = await Promise.all([
    redis.get<number>(METRICS_VISITS_KEY),
    redis.get<number>(METRICS_INSTALLS_KEY),
  ])

  return {
    visits: typeof visits === 'number' ? visits : 0,
    installs: typeof installs === 'number' ? installs : 0,
  }
}
