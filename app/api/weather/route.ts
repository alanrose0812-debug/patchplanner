import { NextRequest, NextResponse } from 'next/server'

interface RegionCoord {
  lat: number
  lon: number
  city: string
}

const REGION_COORDS: Record<string, RegionCoord> = {
  'Northland': { lat: -35.7275, lon: 174.3166, city: 'Whangārei' },
  'Auckland': { lat: -36.8485, lon: 174.7633, city: 'Auckland' },
  'Waikato / Bay of Plenty': { lat: -37.7870, lon: 175.2793, city: 'Hamilton' },
  "Hawke's Bay": { lat: -39.4928, lon: 176.9120, city: 'Napier' },
  'Manawatū': { lat: -40.3523, lon: 175.6082, city: 'Palmerston North' },
  'Wellington': { lat: -41.2865, lon: 174.7762, city: 'Wellington' },
  'Nelson / Tasman': { lat: -41.2706, lon: 173.2840, city: 'Nelson' },
  'Marlborough': { lat: -41.5137, lon: 173.9530, city: 'Blenheim' },
  'West Coast': { lat: -42.4505, lon: 171.2099, city: 'Greymouth' },
  'Canterbury': { lat: -43.5320, lon: 172.6306, city: 'Christchurch' },
  'Central Otago': { lat: -45.2485, lon: 169.3762, city: 'Alexandra' },
  'Dunedin': { lat: -45.8788, lon: 170.5028, city: 'Dunedin' },
  'Southland': { lat: -46.4132, lon: 168.3538, city: 'Invercargill' },
}

interface DayForecast {
  date: string
  high: number
  low: number
  description: string
  icon: string
  rainProbability: number
  windSpeedKmh: number
}

interface WeatherData {
  region: string
  city: string
  current: {
    temp: number
    feelsLike: number
    humidity: number
    windSpeedKmh: number
    description: string
    icon: string
    high: number
    low: number
  } | null
  forecast: DayForecast[]
  lastUpdated: string | null
  fallback?: boolean
  cached?: boolean
  stale?: boolean
}

// In-memory cache (survives across requests within same server process)
const weatherCache: Record<string, { data: WeatherData; timestamp: number }> = {}
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

function processForecast(list: Record<string, unknown>[]): DayForecast[] {
  const days: Record<string, Record<string, unknown>[]> = {}
  list.forEach((item) => {
    const date = new Date((item.dt as number) * 1000).toISOString().split('T')[0]
    if (!days[date]) days[date] = []
    days[date].push(item)
  })

  return Object.entries(days).map(([date, items]) => {
    const temps = items.map((i) => (i.main as Record<string, number>).temp)
    const pops = items.map((i) => (i.pop as number) || 0)
    const winds = items.map((i) => (i.wind as Record<string, number>).speed || 0)
    const midItem = items[Math.floor(items.length / 2)]
    const weather = (midItem.weather as Record<string, string>[])[0]
    return {
      date,
      high: Math.round(Math.max(...temps)),
      low: Math.round(Math.min(...temps)),
      description: weather.description,
      icon: weather.icon,
      rainProbability: Math.round(Math.max(...pops) * 100),
      windSpeedKmh: Math.round((Math.max(...winds) * 3.6)),
    }
  })
}

function getFallbackWeather(region: string, city: string): WeatherData {
  return { region, city, current: null, forecast: [], lastUpdated: null, fallback: true }
}

export async function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get('region') || 'Canterbury'
  const coords = REGION_COORDS[region]

  if (!coords) {
    return NextResponse.json({ error: 'Unknown region' }, { status: 400 })
  }

  // Serve from cache if fresh
  const cached = weatherCache[region]
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ ...cached.data, cached: true })
  }

  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey || apiKey === 'your_openweathermap_api_key_here') {
    return NextResponse.json(getFallbackWeather(region, coords.city))
  }

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric`,
        { next: { revalidate: 0 } }
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric`,
        { next: { revalidate: 0 } }
      ),
    ])

    if (!currentRes.ok || !forecastRes.ok) throw new Error('OpenWeatherMap API error')

    const current = await currentRes.json()
    const forecastRaw = await forecastRes.json()
    const dailyForecasts = processForecast(forecastRaw.list)

    const data: WeatherData = {
      region,
      city: coords.city,
      current: {
        temp: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        humidity: current.main.humidity,
        windSpeedKmh: Math.round(current.wind.speed * 3.6),
        description: current.weather[0].description,
        icon: current.weather[0].icon,
        high: Math.round(current.main.temp_max),
        low: Math.round(current.main.temp_min),
      },
      forecast: dailyForecasts.slice(0, 3),
      lastUpdated: new Date().toISOString(),
    }

    weatherCache[region] = { data, timestamp: Date.now() }
    return NextResponse.json(data)
  } catch {
    // Return stale cache before falling back to placeholder
    if (cached) return NextResponse.json({ ...cached.data, stale: true })
    return NextResponse.json(getFallbackWeather(region, coords.city))
  }
}
