'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── COLOUR TOKENS ────────────────────────────────────────────────────────────
const C = {
  soil: '#1a1208', bark: '#2c1f0e', bark2: '#3a2a12',
  moss: '#2d4a1e', fern: '#3d6b28', leaf: '#5a9e38',
  sprout: '#8bc34a', lime: '#c5e876', cream: '#f0ead8',
  parchment: '#e8dfc4', gold: '#c8a84b', goldLight: '#e0c870',
  rust: '#a0522d', sky: '#7ab8d4',
  textPrimary: '#f0ead8', textSecondary: '#c8b898', textMuted: '#8a7a60',
  cardBg: '#2c1f0e', cardBorder: 'rgba(200,168,75,0.2)',
  danger: '#c04040', warning: '#c89020',
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Crop {
  key: string; name: string; image: string; category: 'vegetable' | 'berry' | 'herb'
  season: string; tip: string; plantSpacingCm: number; rowSpacingCm: number
  plantsPerSquareMetre: number; estimatedYieldPerPlantKg: number
  estimatedYieldPerSquareMetreKg: number; frostSensitive: boolean
  family: string; companionGood: string[]; companionAvoid: string[]
  rootDepth: 'shallow' | 'medium' | 'deep'; feedingLevel: 'low' | 'medium' | 'high'
  waterNeeds: 'low' | 'medium' | 'high'
}
interface BedPlant { cropKey: string; count: number }
interface Bed {
  id: string; name: string; lengthM: number; widthM: number; areaM2: number
  sun: string; soil: string; irrigation: string; notes: string; plants: BedPlant[]
}
interface Region {
  key: string; name: string; island: string; climate: string
  lastFrost: string; firstFrost: string; growingDays: number; description: string
}
interface DayForecast {
  date: string; high: number; low: number; description: string
  icon: string; rainProbability: number; windSpeedKmh: number
}
interface WeatherData {
  region: string; city: string
  current: { temp: number; feelsLike: number; humidity: number; windSpeedKmh: number; description: string; icon: string; high: number; low: number } | null
  forecast: DayForecast[]; lastUpdated: string | null; fallback?: boolean; cached?: boolean; stale?: boolean
}
interface JournalEntry { id: string; date: string; text: string; crops: string[] }
interface PestResult { pest: string; confidence: string; description: string; fix: string; urgency: string; fallback?: boolean }

// ─── REGIONS ──────────────────────────────────────────────────────────────────
const REGIONS: Region[] = [
  { key: 'Northland', name: 'Northland', island: 'North', climate: 'subtropical', lastFrost: 'early June', firstFrost: 'late July', growingDays: 320, description: 'Warm, humid. Very long season — mild winters.' },
  { key: 'Auckland', name: 'Auckland', island: 'North', climate: 'warm-humid', lastFrost: 'mid-June', firstFrost: 'late July', growingDays: 300, description: 'Mild winters, warm summers. Year-round growing.' },
  { key: 'Waikato / Bay of Plenty', name: 'Waikato / Bay of Plenty', island: 'North', climate: 'warm-temperate', lastFrost: 'mid-August', firstFrost: 'late May', growingDays: 270, description: 'Fertile soils, warm summers. Occasional light frost.' },
  { key: "Hawke's Bay", name: "Hawke's Bay", island: 'North', climate: 'warm-dry', lastFrost: 'mid-September', firstFrost: 'late April', growingDays: 250, description: 'Sunny, warm and relatively dry. Excellent for vegetables.' },
  { key: 'Manawatū', name: 'Manawatū', island: 'North', climate: 'temperate', lastFrost: 'late September', firstFrost: 'mid-April', growingDays: 230, description: 'Moderate climate. Windy — use shelterbelts.' },
  { key: 'Wellington', name: 'Wellington', island: 'North', climate: 'cool-windy', lastFrost: 'mid-September', firstFrost: 'late April', growingDays: 220, description: 'Cool, very windy. Shelter is essential for most crops.' },
  { key: 'Nelson / Tasman', name: 'Nelson / Tasman', island: 'South', climate: 'warm-dry', lastFrost: 'mid-September', firstFrost: 'early May', growingDays: 260, description: 'Sunniest region in NZ. Excellent growing conditions.' },
  { key: 'Marlborough', name: 'Marlborough', island: 'South', climate: 'warm-dry', lastFrost: 'late September', firstFrost: 'late April', growingDays: 245, description: 'Hot summers, cold nights. Good for most vegetables.' },
  { key: 'West Coast', name: 'West Coast', island: 'South', climate: 'wet-cool', lastFrost: 'early October', firstFrost: 'mid-April', growingDays: 200, description: 'High rainfall. Raised beds essential for drainage.' },
  { key: 'Canterbury', name: 'Canterbury', island: 'South', climate: 'cool-dry', lastFrost: 'mid-October', firstFrost: 'mid-April', growingDays: 220, description: 'Cold winters, hot dry summers. Frost risk is real.' },
  { key: 'Central Otago', name: 'Central Otago', island: 'South', climate: 'continental', lastFrost: 'late October', firstFrost: 'early April', growingDays: 195, description: 'Extreme temperature range. Short, intense summer.' },
  { key: 'Dunedin', name: 'Dunedin', island: 'South', climate: 'cool', lastFrost: 'mid-October', firstFrost: 'early April', growingDays: 190, description: 'Cool maritime climate. Focus on cold-hardy crops.' },
  { key: 'Southland', name: 'Southland', island: 'South', climate: 'cold', lastFrost: 'early November', firstFrost: 'late March', growingDays: 170, description: 'Cold, short season. Choose fast-maturing varieties.' },
]

// ─── CROPS ────────────────────────────────────────────────────────────────────
const CROPS: Crop[] = [
  { key: 'tomato', name: 'Tomatoes', image: '/crops/tomato.svg', category: 'vegetable', season: 'Summer', tip: 'Sow indoors from October, transplant after last frost.', plantSpacingCm: 50, rowSpacingCm: 70, plantsPerSquareMetre: 2.5, estimatedYieldPerPlantKg: 3, estimatedYieldPerSquareMetreKg: 6, frostSensitive: true, family: 'solanaceae', companionGood: ['basil', 'carrot', 'silverbeet'], companionAvoid: ['potato'], rootDepth: 'deep', feedingLevel: 'high', waterNeeds: 'medium' },
  { key: 'silverbeet', name: 'Silverbeet', image: '/crops/silverbeet.svg', category: 'vegetable', season: 'Year-round', tip: 'Cut-and-come-again. Pick outer leaves and the plant regrows.', plantSpacingCm: 30, rowSpacingCm: 40, plantsPerSquareMetre: 6, estimatedYieldPerPlantKg: 1.5, estimatedYieldPerSquareMetreKg: 8, frostSensitive: false, family: 'chenopodiaceae', companionGood: ['garlic', 'beans'], companionAvoid: [], rootDepth: 'medium', feedingLevel: 'medium', waterNeeds: 'medium' },
  { key: 'potato', name: 'Potatoes', image: '/crops/potato.svg', category: 'vegetable', season: 'Spring–Summer', tip: 'Plant seed potatoes when soil reaches 10°C. Earth up as they grow.', plantSpacingCm: 30, rowSpacingCm: 70, plantsPerSquareMetre: 4, estimatedYieldPerPlantKg: 1.2, estimatedYieldPerSquareMetreKg: 5, frostSensitive: true, family: 'solanaceae', companionGood: ['beans', 'kale'], companionAvoid: ['tomato'], rootDepth: 'medium', feedingLevel: 'medium', waterNeeds: 'medium' },
  { key: 'peas', name: 'Peas', image: '/crops/peas.svg', category: 'vegetable', season: 'Spring', tip: 'Direct sow from August. Add a trellis for climbing varieties.', plantSpacingCm: 8, rowSpacingCm: 45, plantsPerSquareMetre: 15, estimatedYieldPerPlantKg: 0.2, estimatedYieldPerSquareMetreKg: 2, frostSensitive: false, family: 'leguminosae', companionGood: ['carrot', 'silverbeet'], companionAvoid: ['garlic', 'potato'], rootDepth: 'shallow', feedingLevel: 'low', waterNeeds: 'medium' },
  { key: 'carrot', name: 'Carrots', image: '/crops/carrot.svg', category: 'vegetable', season: 'Spring–Autumn', tip: 'Sow direct — carrots dislike transplanting. Thin to 5cm apart.', plantSpacingCm: 5, rowSpacingCm: 25, plantsPerSquareMetre: 64, estimatedYieldPerPlantKg: 0.08, estimatedYieldPerSquareMetreKg: 4, frostSensitive: false, family: 'apiaceae', companionGood: ['peas', 'tomato', 'silverbeet'], companionAvoid: [], rootDepth: 'deep', feedingLevel: 'low', waterNeeds: 'medium' },
  { key: 'kale', name: 'Kale', image: '/crops/kale.svg', category: 'vegetable', season: 'Autumn–Winter', tip: 'Very frost-hardy. Harvest outer leaves. Flavour improves after frost.', plantSpacingCm: 45, rowSpacingCm: 50, plantsPerSquareMetre: 4, estimatedYieldPerPlantKg: 0.8, estimatedYieldPerSquareMetreKg: 3, frostSensitive: false, family: 'brassicaceae', companionGood: ['silverbeet', 'carrot'], companionAvoid: [], rootDepth: 'medium', feedingLevel: 'medium', waterNeeds: 'medium' },
  { key: 'broccoli', name: 'Broccoli', image: '/crops/broccoli.svg', category: 'vegetable', season: 'Autumn–Winter', tip: 'Harvest main head then keep picking side shoots for weeks.', plantSpacingCm: 45, rowSpacingCm: 60, plantsPerSquareMetre: 3.5, estimatedYieldPerPlantKg: 0.5, estimatedYieldPerSquareMetreKg: 1.5, frostSensitive: false, family: 'brassicaceae', companionGood: ['silverbeet', 'carrot'], companionAvoid: [], rootDepth: 'medium', feedingLevel: 'high', waterNeeds: 'medium' },
  { key: 'garlic', name: 'Garlic', image: '/crops/garlic.svg', category: 'vegetable', season: 'Winter', tip: 'Plant cloves in autumn (April–June). Harvest when tops yellow.', plantSpacingCm: 12, rowSpacingCm: 25, plantsPerSquareMetre: 25, estimatedYieldPerPlantKg: 0.06, estimatedYieldPerSquareMetreKg: 1.5, frostSensitive: false, family: 'alliaceae', companionGood: ['silverbeet', 'carrot', 'tomato'], companionAvoid: ['peas', 'beans'], rootDepth: 'shallow', feedingLevel: 'low', waterNeeds: 'low' },
  { key: 'beans', name: 'Beans', image: '/crops/beans.svg', category: 'vegetable', season: 'Summer', tip: 'Direct sow after all frost risk. Pick regularly to extend harvest.', plantSpacingCm: 15, rowSpacingCm: 45, plantsPerSquareMetre: 14, estimatedYieldPerPlantKg: 0.2, estimatedYieldPerSquareMetreKg: 2.5, frostSensitive: true, family: 'leguminosae', companionGood: ['silverbeet', 'carrot', 'kale'], companionAvoid: ['garlic', 'potato'], rootDepth: 'shallow', feedingLevel: 'low', waterNeeds: 'medium' },
  { key: 'strawberry', name: 'Strawberries', image: '/crops/strawberry.svg', category: 'berry', season: 'Spring–Summer', tip: 'Plant runners in autumn. Mulch to keep fruit clean and moist.', plantSpacingCm: 30, rowSpacingCm: 40, plantsPerSquareMetre: 8, estimatedYieldPerPlantKg: 0.4, estimatedYieldPerSquareMetreKg: 3, frostSensitive: false, family: 'rosaceae', companionGood: ['garlic', 'silverbeet'], companionAvoid: [], rootDepth: 'shallow', feedingLevel: 'medium', waterNeeds: 'medium' },
  { key: 'blueberry', name: 'Blueberries', image: '/crops/blueberry.svg', category: 'berry', season: 'Summer', tip: 'Need acidic soil (pH 4.5–5.5). Plant 2+ varieties for pollination.', plantSpacingCm: 120, rowSpacingCm: 180, plantsPerSquareMetre: 0.5, estimatedYieldPerPlantKg: 2, estimatedYieldPerSquareMetreKg: 1, frostSensitive: false, family: 'ericaceae', companionGood: [], companionAvoid: [], rootDepth: 'shallow', feedingLevel: 'low', waterNeeds: 'medium' },
  { key: 'raspberry', name: 'Raspberries', image: '/crops/raspberry.svg', category: 'berry', season: 'Summer', tip: 'Plant canes in winter. Tie to wires. Cut old canes after harvest.', plantSpacingCm: 45, rowSpacingCm: 180, plantsPerSquareMetre: 1.2, estimatedYieldPerPlantKg: 0.8, estimatedYieldPerSquareMetreKg: 1, frostSensitive: false, family: 'rosaceae', companionGood: ['garlic'], companionAvoid: [], rootDepth: 'medium', feedingLevel: 'medium', waterNeeds: 'medium' },
]

const CROP_MAP = Object.fromEntries(CROPS.map(c => [c.key, c]))

// ─── PESTS ────────────────────────────────────────────────────────────────────
const PESTS = [
  { name: 'Tomato Psyllid', severity: 'high' as const, icon: '🔬', tip: 'Check undersides of leaves for tiny nymphs with waxy deposits. Remove and destroy. Spray with Neem oil or Spinosad.' },
  { name: 'White Butterfly', severity: 'medium' as const, icon: '🦋', tip: 'Hand-pick caterpillars and eggs from brassicas daily. Use Btk (Bacillus thuringiensis) spray for infestations.' },
  { name: 'Late Blight', severity: 'high' as const, icon: '🍂', tip: 'Remove infected leaves immediately. Improve airflow. Avoid overhead watering. Copper spray as preventative.' },
  { name: 'Aphids', severity: 'low' as const, icon: '🐛', tip: 'Blast off with strong water spray. Encourage ladybirds. Neem oil or insecticidal soap for larger infestations.' },
  { name: 'Slugs & Snails', severity: 'medium' as const, icon: '🐌', tip: 'Apply iron chelate pellets around seedlings. Beer traps work well. Go out at night with a torch to hand-pick.' },
  { name: 'Powdery Mildew', severity: 'low' as const, icon: '⬜', tip: 'Improve airflow by pruning. Spray with diluted milk (1:9) or potassium bicarbonate. Avoid wetting foliage.' },
]

// ─── MONTHLY TASKS ────────────────────────────────────────────────────────────
const MONTHLY_TASKS: Record<number, string[]> = {
  1: ['Harvest tomatoes, beans and zucchini daily', 'Water deeply every 2–3 days in heat', 'Side-dress tomatoes with liquid potash', 'Pinch out tomato sideshoots'],
  2: ['Sow autumn salads and Asian greens', 'Harvest and store main-crop potatoes', 'Continue harvesting summer crops', 'Sow broccoli and kale for autumn'],
  3: ['Clear summer crops as they finish', 'Plant garlic from mid-March', 'Direct sow spinach and silverbeet', 'Harvest pumpkins before first frost'],
  4: ['Plant garlic and onion sets', 'Sow broad beans', 'Mulch beds to protect soil', 'Plant winter brassica seedlings'],
  5: ['Protect frost-sensitive crops', 'Harvest and store root vegetables', 'Plant bare-rooted raspberry canes', 'Check and adjust mulch on strawberries'],
  6: ['Plant garlic if not done', 'Sow broad beans in warmer regions', 'Order seeds for spring', 'Review last season and plan next'],
  7: ['Plan spring garden layout', 'Order seeds and check stock', 'Apply compost to empty beds', 'Chit potatoes indoors (cool regions)'],
  8: ['Start tomato seeds indoors', 'Sow capsicum and eggplant indoors', 'Direct sow peas in mild regions', 'Plant strawberry runners'],
  9: ['Direct sow peas and silverbeet', 'Harden off seedlings outdoors', 'Prepare beds with compost', 'Plant first early potatoes in warm regions'],
  10: ['Transplant tomatoes after frost risk', 'Direct sow beans (warm regions)', 'Plant pumpkin and zucchini seeds', 'Sow basil indoors'],
  11: ['Stake tomatoes and tie in', 'Water regularly — spring drying wind', 'Feed tomatoes with liquid fertiliser', 'Watch for white butterfly on brassicas'],
  12: ['Harvest lettuce and salad greens', 'Water daily in hot weather', 'Harvest peas and beans regularly', 'Mulch around fruiting crops'],
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function newId(): string { return `bed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

function calcArea(l: number, w: number): number { return Math.round(l * w * 100) / 100 }

function calcMaxPlants(bed: Bed, crop: Crop): number {
  const along = Math.floor((bed.lengthM * 100) / crop.plantSpacingCm)
  const across = Math.floor((bed.widthM * 100) / crop.rowSpacingCm)
  return Math.max(1, along * across)
}

function calcYield(crop: Crop, count: number): { min: number; max: number } {
  const base = count * crop.estimatedYieldPerPlantKg
  return { min: Math.round(base * 0.7 * 10) / 10, max: Math.round(base * 1.25 * 10) / 10 }
}

function totalBedPlants(bed: Bed): number { return bed.plants.reduce((s, p) => s + p.count, 0) }

function totalPlantCapacity(bed: Bed): number {
  return bed.plants.reduce((s, p) => {
    const c = CROP_MAP[p.cropKey]; return s + (c ? calcMaxPlants(bed, c) : 0)
  }, 0)
}

function isOvercrowded(bed: Bed): boolean {
  let usedArea = 0
  bed.plants.forEach(p => {
    const c = CROP_MAP[p.cropKey]
    if (c) usedArea += p.count / c.plantsPerSquareMetre
  })
  return usedArea > bed.areaM2 * 1.05
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric' })
}

function weatherIcon(icon: string): string {
  const map: Record<string, string> = {
    '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '⛅',
    '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️',
  }
  return map[icon] || '🌤️'
}

// Garden alerts
function getAlerts(weather: WeatherData, selectedCrops: string[], region: string): { type: string; message: string; icon: string }[] {
  const alerts: { type: string; message: string; icon: string }[] = []
  if (!weather.current && weather.forecast.length === 0) return alerts

  const frostSensitiveCrops = selectedCrops.filter(k => CROP_MAP[k]?.frostSensitive).map(k => CROP_MAP[k].name)
  const fc = weather.forecast

  // Frost alert
  const minLow = fc.length > 0 ? Math.min(...fc.map(d => d.low)) : (weather.current?.low ?? 99)
  if (minLow < 3) {
    const crops = frostSensitiveCrops.length > 0 ? `Cover ${frostSensitiveCrops.slice(0, 3).join(', ')}.` : 'Cover frost-sensitive seedlings.'
    alerts.push({ type: 'frost', icon: '🧊', message: `Frost risk ahead in ${region}. ${crops}` })
  }

  // Heat alert
  const maxHigh = fc.length > 0 ? Math.max(...fc.map(d => d.high)) : (weather.current?.high ?? 0)
  if (maxHigh > 28) {
    alerts.push({ type: 'heat', icon: '🌡️', message: 'Hot day forecast. Water leafy greens early and shade lettuce if possible.' })
  }

  // Wind alert
  const maxWind = fc.length > 0 ? Math.max(...fc.map(d => d.windSpeedKmh)) : (weather.current?.windSpeedKmh ?? 0)
  if (maxWind > 40) {
    alerts.push({ type: 'wind', icon: '💨', message: 'Strong wind forecast. Stake tomatoes and protect young seedlings.' })
  }

  // Heavy rain alert
  const maxRain = fc.length > 0 ? Math.max(...fc.map(d => d.rainProbability)) : 0
  if (maxRain > 70) {
    alerts.push({ type: 'rain', icon: '🌧️', message: 'Rain likely. Delay watering and check drainage around carrots and onions.' })
  }

  // Dry spell alert
  if (fc.length >= 3 && fc.every(d => d.rainProbability < 20)) {
    alerts.push({ type: 'dry', icon: '🏜️', message: 'No useful rain forecast. Check raised beds, pots, and shallow-rooted crops.' })
  }

  return alerts
}

// ─── DEFAULT STATE ─────────────────────────────────────────────────────────────
const DEFAULT_BEDS: Bed[] = [
  { id: 'bed_default_1', name: 'Main Raised Bed', lengthM: 3, widthM: 1.2, areaM2: 3.6, sun: 'full', soil: 'raised-bed mix', irrigation: 'hand watered', notes: '', plants: [] },
]

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'patchplanner_v2'
function loadState() {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}
function saveState(data: object) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* quota exceeded */ }
}

// ─── INLINE ICON COMPONENTS ───────────────────────────────────────────────────
function IconHome() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function IconSeed() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M12 12C12 7 7 3 2 3c0 5 4 9 10 9z"/><path d="M12 12c0-5 5-9 10-9-1 5-5 9-10 9z"/></svg>
}
function IconBug() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.88 1.88M15.12 3.88L17 2"/><path d="M9 7.13v-.09C9 5.36 10.24 4 11.79 4h.42C13.76 4 15 5.36 15 6.04"/><path d="M7 14c0-2.21 1.79-4 4-4h2c2.21 0 4 1.79 4 4v4H7v-4z"/><path d="M7 14H4M20 14h-3M7 18H4M20 18h-3M9 22v-2M15 22v-2"/></svg>
}
function IconGrid() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
}
function IconPlus() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function IconTrash() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}
function IconEdit() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}
function IconCopy() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
}
function IconBook() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
}
function IconCalendar() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}

// ─── WEATHER CARD ─────────────────────────────────────────────────────────────
function WeatherCard({ weather, loading, error, selectedCrops, region }: {
  weather: WeatherData | null; loading: boolean; error: string | null; selectedCrops: string[]; region: string
}) {
  const alerts = weather ? getAlerts(weather, selectedCrops, region) : []

  if (loading) return (
    <div style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: '20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.6 }}>
        <div style={{ fontSize: 28 }}>🌤️</div>
        <div>
          <div style={{ color: C.textSecondary, fontSize: 13 }}>Fetching weather…</div>
          <div style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }}>Checking {region}</div>
        </div>
      </div>
    </div>
  )

  if (!weather || (weather.fallback && !weather.current)) return (
    <div style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: '20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 28 }}>🌿</div>
        <div>
          <div style={{ color: C.textPrimary, fontWeight: 600, fontSize: 15 }}>{region}</div>
          <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>Weather unavailable. Add OPENWEATHER_API_KEY to enable.</div>
        </div>
      </div>
    </div>
  )

  const cur = weather.current!
  const regionData = REGIONS.find(r => r.key === region)

  return (
    <div style={{ background: `linear-gradient(135deg, ${C.moss} 0%, ${C.bark} 100%)`, border: `1px solid rgba(200,168,75,0.3)`, borderRadius: 16, padding: '18px', marginBottom: 16 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ color: C.gold, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{weather.city || region}</div>
          <div style={{ color: C.textPrimary, fontSize: 13, marginTop: 2, opacity: 0.8 }}>{regionData?.description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {weather.stale && <span style={{ background: C.warning, color: '#000', fontSize: 9, padding: '2px 6px', borderRadius: 8, fontWeight: 700 }}>STALE</span>}
        </div>
      </div>

      {/* Temperature row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 44, lineHeight: 1 }}>{weatherIcon(cur.icon)}</div>
        <div>
          <div style={{ fontSize: 42, fontWeight: 300, color: C.cream, lineHeight: 1 }}>{cur.temp}°</div>
          <div style={{ color: C.textSecondary, fontSize: 12, textTransform: 'capitalize', marginTop: 2 }}>{cur.description}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ color: C.cream, fontSize: 14 }}>↑ {cur.high}° <span style={{ color: C.sky }}>↓ {cur.low}°</span></div>
          <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>💧 {cur.humidity}%</div>
          <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>💨 {cur.windSpeedKmh} km/h</div>
        </div>
      </div>

      {/* 3-day forecast */}
      {weather.forecast.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {weather.forecast.slice(0, 3).map((day, i) => (
            <div key={i} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ color: C.gold, fontSize: 11, fontWeight: 600 }}>{fmtDay(day.date)}</div>
              <div style={{ fontSize: 20, margin: '6px 0' }}>{weatherIcon(day.icon)}</div>
              <div style={{ color: C.cream, fontSize: 12 }}>{day.high}° <span style={{ color: C.sky, fontSize: 11 }}>{day.low}°</span></div>
              {day.rainProbability > 20 && <div style={{ color: C.sky, fontSize: 10, marginTop: 3 }}>💧{day.rainProbability}%</div>}
            </div>
          ))}
        </div>
      )}

      {/* Garden alerts */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ background: a.type === 'frost' ? 'rgba(100,150,220,0.15)' : a.type === 'heat' ? 'rgba(200,80,20,0.15)' : 'rgba(200,168,75,0.12)', border: `1px solid ${a.type === 'frost' ? 'rgba(100,150,220,0.3)' : a.type === 'heat' ? 'rgba(200,80,20,0.3)' : C.cardBorder}`, borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
              <span style={{ fontSize: 12, color: C.parchment, lineHeight: 1.5 }}>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Last updated */}
      {weather.lastUpdated && (
        <div style={{ color: C.textMuted, fontSize: 10, marginTop: 12, textAlign: 'right' }}>
          Updated {fmtDate(weather.lastUpdated)}
        </div>
      )}
    </div>
  )
}

// ─── BED MAP ──────────────────────────────────────────────────────────────────
function BedMap({ bed }: { bed: Bed }) {
  const displayW = 320
  const ratio = bed.widthM / bed.lengthM
  const displayH = Math.max(80, Math.min(displayW * ratio, 260))

  // Grid spacing in pixels: aim for ~30cm grid lines
  const gridColPx = displayW / (bed.lengthM / 0.3)
  const gridRowPx = displayH / (bed.widthM / 0.3)

  // Generate grid lines
  const vLines: number[] = []
  for (let x = gridColPx; x < displayW; x += gridColPx) vLines.push(x)
  const hLines: number[] = []
  for (let y = gridRowPx; y < displayH; y += gridRowPx) hLines.push(y)

  // Place plant markers
  interface Marker { x: number; y: number; cropKey: string; overflow: boolean }
  const markers: Marker[] = []
  let colIdx = 0, rowIdx = 0

  bed.plants.forEach(({ cropKey, count }) => {
    const crop = CROP_MAP[cropKey]
    if (!crop) return
    const colStep = displayW / Math.max(1, (bed.lengthM * 100) / crop.plantSpacingCm)
    const rowStep = displayH / Math.max(1, (bed.widthM * 100) / crop.rowSpacingCm)
    const maxCols = Math.max(1, Math.floor(displayW / colStep))

    for (let i = 0; i < count; i++) {
      const col = colIdx % maxCols
      const row = rowIdx
      const x = col * colStep + colStep / 2
      const y = row * rowStep + rowStep / 2
      markers.push({ x, y, cropKey, overflow: x > displayW || y > displayH })
      colIdx++
      if (colIdx % maxCols === 0) { rowIdx++; }
    }
  })

  return (
    <div style={{ overflowX: 'auto', marginBottom: 8 }}>
      <svg width={displayW} height={displayH} style={{ border: `2px solid ${C.gold}`, borderRadius: 8, display: 'block' }}>
        {/* Soil background */}
        <rect width={displayW} height={displayH} fill="#3a2510"/>
        {/* Soil texture pattern */}
        <rect width={displayW} height={displayH} fill="url(#soilPat)" opacity="0.4"/>
        <defs>
          <pattern id="soilPat" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="#5a3a18" opacity="0.5"/>
            <circle cx="6" cy="6" r="0.6" fill="#4a2a0e" opacity="0.4"/>
          </pattern>
        </defs>
        {/* Grid lines */}
        {vLines.map((x, i) => <line key={`v${i}`} x1={x} y1={0} x2={x} y2={displayH} stroke="rgba(200,168,75,0.15)" strokeWidth="0.5"/>)}
        {hLines.map((y, i) => <line key={`h${i}`} x1={0} y1={y} x2={displayW} y2={y} stroke="rgba(200,168,75,0.15)" strokeWidth="0.5"/>)}
        {/* Plant markers */}
        {markers.filter(m => !m.overflow && m.x < displayW && m.y < displayH).map((m, i) => (
          <g key={i}>
            <circle cx={m.x} cy={m.y} r={14} fill="rgba(45,74,30,0.7)" stroke={C.fern} strokeWidth="1"/>
            <image href={CROP_MAP[m.cropKey]?.image} x={m.x - 11} y={m.y - 11} width={22} height={22}/>
          </g>
        ))}
        {/* Overflow indicator */}
        {markers.some(m => m.overflow) && (
          <text x={displayW - 8} y={displayH - 8} textAnchor="end" fill={C.warning} fontSize="11">⚠ overflow</text>
        )}
        {/* Dimensions label */}
        <text x={8} y={displayH - 6} fill="rgba(200,168,75,0.5)" fontSize="9">{bed.lengthM}m × {bed.widthM}m</text>
      </svg>
    </div>
  )
}

// ─── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab({ region, setRegion, householdSize, setHouseholdSize, selectedCrops, beds, weather, weatherLoading, weatherError, onExportCalendar }: {
  region: string; setRegion: (r: string) => void; householdSize: number; setHouseholdSize: (n: number) => void
  selectedCrops: string[]; beds: Bed[]; weather: WeatherData | null; weatherLoading: boolean; weatherError: string | null
  onExportCalendar: () => void
}) {
  const month = new Date().getMonth() + 1
  const tasks = MONTHLY_TASKS[month] || []
  const regionData = REGIONS.find(r => r.key === region)!

  return (
    <div style={{ padding: '0 16px 100px' }}>
      {/* Household size */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Household Size</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4, 5, 6].map(n => (
            <button key={n} onClick={() => setHouseholdSize(n)} style={{ flex: 1, height: 44, borderRadius: 10, background: householdSize === n ? C.fern : C.bark2, border: `1px solid ${householdSize === n ? C.leaf : C.cardBorder}`, color: householdSize === n ? C.lime : C.textSecondary, fontWeight: householdSize === n ? 700 : 400, fontSize: 16, transition: 'all 0.15s' }}>
              {n}
            </button>
          ))}
        </div>
        <div style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>Affects quantity estimates across your beds</div>
      </div>

      {/* Weather */}
      <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Garden Weather</div>
      <WeatherCard weather={weather} loading={weatherLoading} error={weatherError} selectedCrops={selectedCrops} region={region}/>

      {/* Monthly tasks */}
      <div style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: '16px', marginBottom: 16 }}>
        <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          {new Date().toLocaleString('en-NZ', { month: 'long' })} Tasks
        </div>
        {tasks.map((task, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: i < tasks.length - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.leaf, flexShrink: 0, marginTop: 5 }}/>
            <div style={{ color: C.parchment, fontSize: 13, lineHeight: 1.5 }}>{task}</div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Growing Days', value: regionData.growingDays },
          { label: 'Crops Selected', value: selectedCrops.length },
          { label: 'Garden Beds', value: beds.length },
        ].map(s => (
          <div key={s.label} style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ color: C.gold, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: C.textMuted, fontSize: 10, marginTop: 4, lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Calendar export */}
      <button onClick={onExportCalendar} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 12, background: `linear-gradient(135deg, ${C.moss}, ${C.bark})`, border: `1px solid rgba(200,168,75,0.3)`, color: C.parchment, fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
        <IconCalendar/>
        Export Planting Calendar (.ics)
      </button>

      {/* Climate info */}
      <div style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: '14px' }}>
        <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>{region} Climate</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Climate', value: regionData.climate },
            { label: 'Island', value: regionData.island },
            { label: 'Last Frost', value: regionData.lastFrost },
            { label: 'First Frost', value: regionData.firstFrost },
          ].map(d => (
            <div key={d.label}>
              <div style={{ color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.label}</div>
              <div style={{ color: C.cream, fontSize: 13, marginTop: 2, textTransform: 'capitalize' }}>{d.value}</div>
            </div>
          ))}
        </div>
        <div style={{ color: C.textSecondary, fontSize: 12, marginTop: 10, paddingTop: 10, borderTop: `1px solid rgba(255,255,255,0.06)` }}>{regionData.description}</div>
      </div>
    </div>
  )
}

// ─── CROP CARD ────────────────────────────────────────────────────────────────
function CropCard({ crop, selected, onClick, householdSize }: { crop: Crop; selected: boolean; onClick: () => void; householdSize: number }) {
  const plants = Math.ceil(crop.plantsPerSquareMetre * 2 * householdSize * 0.4)
  const ySingle = calcYield(crop, plants)

  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', background: selected ? `linear-gradient(145deg, ${C.moss}, ${C.bark})` : C.bark, border: `1.5px solid ${selected ? C.leaf : C.cardBorder}`, borderRadius: 14, padding: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}>
      {/* Selected indicator */}
      {selected && <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: C.leaf, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</div>}

      {/* Crop image */}
      <div style={{ width: 64, height: 64, marginBottom: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <img src={crop.image} alt={crop.name} style={{ width: 52, height: 52, objectFit: 'contain' }}/>
      </div>

      {/* Name */}
      <div style={{ color: C.cream, fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{crop.name}</div>

      {/* Season badge */}
      <div style={{ display: 'inline-block', background: 'rgba(200,168,75,0.15)', border: `1px solid rgba(200,168,75,0.3)`, borderRadius: 6, padding: '2px 7px', fontSize: 10, color: C.gold, fontWeight: 600, marginBottom: 8 }}>{crop.season}</div>

      {/* Tip */}
      <div style={{ color: C.textSecondary, fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>{crop.tip}</div>

      {/* Spacing info */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: C.textMuted, background: 'rgba(255,255,255,0.04)', borderRadius: 5, padding: '2px 6px' }}>{crop.plantSpacingCm}cm spacing</span>
        {selected && <span style={{ fontSize: 10, color: C.sprout, background: 'rgba(139,195,74,0.1)', borderRadius: 5, padding: '2px 6px' }}>~{plants} plants</span>}
      </div>

      {/* Frost warning */}
      {crop.frostSensitive && <div style={{ marginTop: 6, fontSize: 10, color: C.sky, opacity: 0.8 }}>❄ Frost sensitive</div>}
    </button>
  )
}

// ─── CROPS TAB ────────────────────────────────────────────────────────────────
function CropsTab({ selectedCrops, setSelectedCrops, householdSize }: {
  selectedCrops: string[]; setSelectedCrops: (c: string[]) => void; householdSize: number
}) {
  const [filter, setFilter] = useState<'all' | 'vegetable' | 'berry'>('all')
  const filtered = CROPS.filter(c => filter === 'all' || c.category === filter)

  const toggle = (key: string) => {
    setSelectedCrops(selectedCrops.includes(key) ? selectedCrops.filter(k => k !== key) : [...selectedCrops, key])
  }

  return (
    <div style={{ padding: '0 16px 100px' }}>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'vegetable', 'berry'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: 20, background: filter === f ? C.fern : C.bark2, border: `1px solid ${filter === f ? C.leaf : C.cardBorder}`, color: filter === f ? C.lime : C.textSecondary, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
            {f === 'all' ? 'All Crops' : f === 'vegetable' ? 'Vegetables' : 'Berries'}
          </button>
        ))}
      </div>

      {/* Selection count */}
      {selectedCrops.length > 0 && (
        <div style={{ color: C.sprout, fontSize: 12, marginBottom: 12 }}>
          {selectedCrops.length} crop{selectedCrops.length !== 1 ? 's' : ''} selected
        </div>
      )}

      {/* Crop grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {filtered.map(crop => (
          <CropCard key={crop.key} crop={crop} selected={selectedCrops.includes(crop.key)} onClick={() => toggle(crop.key)} householdSize={householdSize}/>
        ))}
      </div>
    </div>
  )
}

// ─── CARE TAB ─────────────────────────────────────────────────────────────────
function CareTab({ selectedCrops }: { selectedCrops: string[] }) {
  const [pestQuery, setPestQuery] = useState('')
  const [pestResult, setPestResult] = useState<PestResult | null>(null)
  const [pestLoading, setPestLoading] = useState(false)

  const handleIdentify = async () => {
    if (!pestQuery.trim()) return
    setPestLoading(true)
    try {
      const res = await fetch('/api/identify-pest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: pestQuery, crops: selectedCrops.map(k => CROP_MAP[k]?.name) }),
      })
      const data = await res.json()
      setPestResult(data)
    } catch {
      setPestResult({ pest: 'Error', confidence: 'low', description: 'Could not connect to identification service.', fix: 'Check your network and try again.', urgency: 'low' })
    } finally {
      setPestLoading(false)
    }
  }

  const urgencyColor = (u: string) => u === 'high' ? C.danger : u === 'medium' ? C.warning : C.leaf
  const severityColor = (s: string) => s === 'high' ? C.danger : s === 'medium' ? C.warning : C.leaf

  // Feed reminders based on selected crops
  const feedReminders: { crop: string; feed: string; timing: string }[] = []
  if (selectedCrops.includes('tomato')) feedReminders.push({ crop: 'Tomatoes', feed: 'Liquid potash', timing: 'Once weekly from first flowers' })
  if (selectedCrops.includes('silverbeet')) feedReminders.push({ crop: 'Silverbeet', feed: 'Blood & bone', timing: 'Every 6 weeks' })
  if (selectedCrops.includes('broccoli')) feedReminders.push({ crop: 'Broccoli', feed: 'Vegetable fertiliser', timing: 'Fortnightly' })
  if (selectedCrops.includes('potato')) feedReminders.push({ crop: 'Potatoes', feed: 'Compost tea', timing: 'When earthing up' })
  if (selectedCrops.includes('beans')) feedReminders.push({ crop: 'Beans', feed: 'Light compost only', timing: 'At planting — avoid nitrogen' })

  return (
    <div style={{ padding: '0 16px 100px' }}>
      {/* AI Pest Identifier */}
      <div style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: '16px', marginBottom: 16 }}>
        <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>AI Pest Identifier</div>
        <textarea
          value={pestQuery}
          onChange={e => setPestQuery(e.target.value)}
          placeholder="Describe what you're seeing — yellowing leaves, holes in foliage, white powder, sticky residue…"
          style={{ width: '100%', background: C.bark2, border: `1px solid ${C.cardBorder}`, borderRadius: 10, color: C.cream, padding: '12px', fontSize: 13, resize: 'none', minHeight: 90, lineHeight: 1.5 }}
        />
        <button onClick={handleIdentify} disabled={pestLoading || !pestQuery.trim()} style={{ marginTop: 10, width: '100%', padding: '12px', borderRadius: 10, background: pestLoading || !pestQuery.trim() ? C.bark2 : C.fern, color: pestLoading || !pestQuery.trim() ? C.textMuted : C.lime, fontWeight: 700, fontSize: 14, border: `1px solid ${pestLoading ? C.cardBorder : C.leaf}`, transition: 'all 0.15s' }}>
          {pestLoading ? 'Identifying…' : 'Identify Problem'}
        </button>

        {pestResult && (
          <div style={{ marginTop: 14, background: C.bark2, borderRadius: 12, padding: '14px', border: `1px solid rgba(200,168,75,0.15)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ color: C.cream, fontWeight: 700, fontSize: 16 }}>{pestResult.pest}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ background: `${urgencyColor(pestResult.urgency)}22`, border: `1px solid ${urgencyColor(pestResult.urgency)}44`, color: urgencyColor(pestResult.urgency), fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 700, textTransform: 'uppercase' }}>{pestResult.urgency}</span>
                <span style={{ background: 'rgba(255,255,255,0.06)', color: C.textMuted, fontSize: 10, padding: '2px 7px', borderRadius: 6 }}>{pestResult.confidence} confidence</span>
              </div>
            </div>
            <div style={{ color: C.textSecondary, fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>{pestResult.description}</div>
            <div style={{ background: 'rgba(45,74,30,0.4)', border: `1px solid rgba(90,158,56,0.2)`, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ color: C.sprout, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>ORGANIC CONTROL</div>
              <div style={{ color: C.parchment, fontSize: 12, lineHeight: 1.6 }}>{pestResult.fix}</div>
            </div>
            {pestResult.fallback && <div style={{ color: C.textMuted, fontSize: 10, marginTop: 8 }}>Add ANTHROPIC_API_KEY for AI-powered identification.</div>}
          </div>
        )}
      </div>

      {/* Pest guide */}
      <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Common NZ Pests & Diseases</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {PESTS.map((pest, i) => (
          <div key={i} style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: '14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>{pest.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ color: C.cream, fontWeight: 700, fontSize: 14 }}>{pest.name}</div>
                <span style={{ background: `${severityColor(pest.severity)}22`, border: `1px solid ${severityColor(pest.severity)}44`, color: severityColor(pest.severity), fontSize: 9, padding: '2px 6px', borderRadius: 5, fontWeight: 700, textTransform: 'uppercase' }}>{pest.severity}</span>
              </div>
              <div style={{ color: C.textSecondary, fontSize: 12, lineHeight: 1.5 }}>{pest.tip}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Feed reminders */}
      {feedReminders.length > 0 && (
        <>
          <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Feed Reminders</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {feedReminders.map((r, i) => (
              <div key={i} style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: C.cream, fontSize: 13, fontWeight: 600 }}>{r.crop}</div>
                  <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{r.timing}</div>
                </div>
                <div style={{ background: 'rgba(200,168,75,0.12)', border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: '4px 10px', color: C.gold, fontSize: 11, fontWeight: 600 }}>{r.feed}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── PATCH TAB ────────────────────────────────────────────────────────────────
function PatchTab({ beds, setBeds, selectedCrops }: {
  beds: Bed[]; setBeds: (b: Bed[]) => void; selectedCrops: string[]
}) {
  const [activeBedId, setActiveBedId] = useState<string>(beds[0]?.id || '')
  const [showAddBed, setShowAddBed] = useState(false)
  const [editingBedId, setEditingBedId] = useState<string | null>(null)
  const [showAddCropModal, setShowAddCropModal] = useState(false)
  const [newBed, setNewBed] = useState({ name: '', lengthM: '3', widthM: '1.2' })

  const activeBed = beds.find(b => b.id === activeBedId) || beds[0]

  const totalArea = beds.reduce((s, b) => s + b.areaM2, 0)

  const updateBed = (id: string, updates: Partial<Bed>) => {
    setBeds(beds.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const addBed = () => {
    const l = parseFloat(newBed.lengthM) || 2
    const w = parseFloat(newBed.widthM) || 1
    const bed: Bed = {
      id: newId(), name: newBed.name || `Bed ${beds.length + 1}`,
      lengthM: l, widthM: w, areaM2: calcArea(l, w),
      sun: 'full', soil: 'raised-bed mix', irrigation: 'hand watered', notes: '', plants: [],
    }
    const updated = [...beds, bed]
    setBeds(updated)
    setActiveBedId(bed.id)
    setNewBed({ name: '', lengthM: '3', widthM: '1.2' })
    setShowAddBed(false)
  }

  const deleteBed = (id: string) => {
    const updated = beds.filter(b => b.id !== id)
    setBeds(updated)
    if (activeBedId === id) setActiveBedId(updated[0]?.id || '')
  }

  const duplicateBed = (bed: Bed) => {
    const dup: Bed = { ...bed, id: newId(), name: `${bed.name} (copy)`, plants: [...bed.plants.map(p => ({ ...p }))] }
    setBeds([...beds, dup])
  }

  const addCropToBed = (cropKey: string) => {
    if (!activeBed) return
    const existing = activeBed.plants.find(p => p.cropKey === cropKey)
    const crop = CROP_MAP[cropKey]
    if (!crop) return
    const suggested = calcMaxPlants(activeBed, crop)
    if (existing) {
      updateBed(activeBed.id, { plants: activeBed.plants.map(p => p.cropKey === cropKey ? { ...p, count: p.count + 1 } : p) })
    } else {
      updateBed(activeBed.id, { plants: [...activeBed.plants, { cropKey, count: Math.min(suggested, 12) }] })
    }
    setShowAddCropModal(false)
  }

  const removeCropFromBed = (cropKey: string) => {
    if (!activeBed) return
    updateBed(activeBed.id, { plants: activeBed.plants.filter(p => p.cropKey !== cropKey) })
  }

  const adjustCount = (cropKey: string, delta: number) => {
    if (!activeBed) return
    updateBed(activeBed.id, {
      plants: activeBed.plants.map(p => p.cropKey === cropKey ? { ...p, count: Math.max(1, p.count + delta) } : p).filter(p => p.count > 0),
    })
  }

  const overcrowded = activeBed ? isOvercrowded(activeBed) : false

  // Bed editor fields
  const [editFields, setEditFields] = useState({ name: '', lengthM: '', widthM: '' })

  const startEdit = (bed: Bed) => {
    setEditFields({ name: bed.name, lengthM: String(bed.lengthM), widthM: String(bed.widthM) })
    setEditingBedId(bed.id)
  }

  const saveEdit = () => {
    if (!editingBedId) return
    const l = parseFloat(editFields.lengthM) || 1
    const w = parseFloat(editFields.widthM) || 1
    updateBed(editingBedId, { name: editFields.name || 'Unnamed bed', lengthM: l, widthM: w, areaM2: calcArea(l, w) })
    setEditingBedId(null)
  }

  // Total harvest estimate for the active bed
  const harvestLines: { name: string; min: number; max: number; unit: string }[] = activeBed?.plants.map(p => {
    const c = CROP_MAP[p.cropKey]
    if (!c) return null
    const y = calcYield(c, p.count)
    return { name: c.name, min: y.min, max: y.max, unit: 'kg' }
  }).filter(Boolean) as typeof harvestLines || []

  const availableCrops = selectedCrops.filter(k => !activeBed?.plants.find(p => p.cropKey === k))

  return (
    <div style={{ padding: '0 16px 100px' }}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <div style={{ color: C.gold, fontSize: 20, fontWeight: 700 }}>{beds.length}</div>
          <div style={{ color: C.textMuted, fontSize: 10 }}>Beds</div>
        </div>
        <div style={{ flex: 1, background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <div style={{ color: C.gold, fontSize: 20, fontWeight: 700 }}>{totalArea.toFixed(1)}m²</div>
          <div style={{ color: C.textMuted, fontSize: 10 }}>Total Area</div>
        </div>
        <div style={{ flex: 1, background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <div style={{ color: C.gold, fontSize: 20, fontWeight: 700 }}>{beds.reduce((s, b) => s + b.plants.reduce((ps, p) => ps + p.count, 0), 0)}</div>
          <div style={{ color: C.textMuted, fontSize: 10 }}>Plants</div>
        </div>
      </div>

      {/* Bed list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {beds.map(bed => (
          <div key={bed.id} onClick={() => setActiveBedId(bed.id)} style={{ background: activeBedId === bed.id ? `linear-gradient(135deg, ${C.moss}, ${C.bark})` : C.bark, border: `1.5px solid ${activeBedId === bed.id ? C.fern : C.cardBorder}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
            {editingBedId === bed.id ? (
              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={editFields.name} onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))} placeholder="Bed name" style={{ background: C.bark2, border: `1px solid ${C.cardBorder}`, borderRadius: 8, color: C.cream, padding: '8px 10px', fontSize: 13 }}/>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: C.textMuted, fontSize: 10 }}>Length (m)</label>
                    <input type="number" step="0.1" value={editFields.lengthM} onChange={e => setEditFields(f => ({ ...f, lengthM: e.target.value }))} style={{ width: '100%', background: C.bark2, border: `1px solid ${C.cardBorder}`, borderRadius: 8, color: C.cream, padding: '8px 10px', fontSize: 13 }}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: C.textMuted, fontSize: 10 }}>Width (m)</label>
                    <input type="number" step="0.1" value={editFields.widthM} onChange={e => setEditFields(f => ({ ...f, widthM: e.target.value }))} style={{ width: '100%', background: C.bark2, border: `1px solid ${C.cardBorder}`, borderRadius: 8, color: C.cream, padding: '8px 10px', fontSize: 13 }}/>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveEdit} style={{ flex: 1, padding: '8px', borderRadius: 8, background: C.fern, color: C.lime, fontWeight: 700, fontSize: 13, border: `1px solid ${C.leaf}` }}>Save</button>
                  <button onClick={() => setEditingBedId(null)} style={{ flex: 1, padding: '8px', borderRadius: 8, background: C.bark2, color: C.textSecondary, fontSize: 13, border: `1px solid ${C.cardBorder}` }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: C.cream, fontWeight: 700, fontSize: 14 }}>{bed.name}</div>
                  <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{bed.lengthM}m × {bed.widthM}m · {bed.areaM2}m² · {bed.sun}</div>
                  {bed.plants.length > 0 && <div style={{ color: C.sprout, fontSize: 11, marginTop: 3 }}>{bed.plants.map(p => CROP_MAP[p.cropKey]?.name).join(', ')}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => startEdit(bed)} style={{ background: 'rgba(200,168,75,0.1)', border: `1px solid ${C.cardBorder}`, borderRadius: 7, padding: '6px 8px', color: C.gold }}><IconEdit/></button>
                  <button onClick={() => duplicateBed(bed)} style={{ background: 'rgba(90,158,56,0.1)', border: `1px solid rgba(90,158,56,0.2)`, borderRadius: 7, padding: '6px 8px', color: C.leaf }}><IconCopy/></button>
                  {beds.length > 1 && <button onClick={() => deleteBed(bed.id)} style={{ background: 'rgba(192,64,64,0.1)', border: `1px solid rgba(192,64,64,0.2)`, borderRadius: 7, padding: '6px 8px', color: C.danger }}><IconTrash/></button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add bed button */}
      {!showAddBed && (
        <button onClick={() => setShowAddBed(true)} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'transparent', border: `1.5px dashed ${C.fern}`, color: C.leaf, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          <IconPlus/> Add New Bed
        </button>
      )}

      {/* Add bed form */}
      {showAddBed && (
        <div style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: '14px', marginBottom: 16 }}>
          <div style={{ color: C.gold, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>New Garden Bed</div>
          <input value={newBed.name} onChange={e => setNewBed(n => ({ ...n, name: e.target.value }))} placeholder="e.g. Front raised bed" style={{ width: '100%', background: C.bark2, border: `1px solid ${C.cardBorder}`, borderRadius: 8, color: C.cream, padding: '10px 12px', fontSize: 13, marginBottom: 10 }}/>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: C.textMuted, fontSize: 10, display: 'block', marginBottom: 4 }}>Length (m)</label>
              <input type="number" step="0.1" value={newBed.lengthM} onChange={e => setNewBed(n => ({ ...n, lengthM: e.target.value }))} style={{ width: '100%', background: C.bark2, border: `1px solid ${C.cardBorder}`, borderRadius: 8, color: C.cream, padding: '10px 12px', fontSize: 13 }}/>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: C.textMuted, fontSize: 10, display: 'block', marginBottom: 4 }}>Width (m)</label>
              <input type="number" step="0.1" value={newBed.widthM} onChange={e => setNewBed(n => ({ ...n, widthM: e.target.value }))} style={{ width: '100%', background: C.bark2, border: `1px solid ${C.cardBorder}`, borderRadius: 8, color: C.cream, padding: '10px 12px', fontSize: 13 }}/>
            </div>
          </div>
          <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 12 }}>
            Area: <span style={{ color: C.gold }}>{calcArea(parseFloat(newBed.lengthM) || 0, parseFloat(newBed.widthM) || 0)}m²</span>
          </div>
          {/* Preset sizes */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {[['1.0', '3.0'], ['1.2', '2.4'], ['0.8', '1.8'], ['1.2', '3.6']].map(([w, l]) => (
              <button key={`${l}x${w}`} onClick={() => setNewBed(n => ({ ...n, lengthM: l, widthM: w }))} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, background: C.bark2, border: `1px solid ${C.cardBorder}`, color: C.textSecondary }}>
                {l}×{w}m
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addBed} style={{ flex: 1, padding: '10px', borderRadius: 10, background: C.fern, color: C.lime, fontWeight: 700, fontSize: 13, border: `1px solid ${C.leaf}` }}>Add Bed</button>
            <button onClick={() => setShowAddBed(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: C.bark2, color: C.textSecondary, fontSize: 13, border: `1px solid ${C.cardBorder}` }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Active bed details */}
      {activeBed && (
        <>
          {/* Bed map */}
          <div style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: '16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ color: C.gold, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{activeBed.name} — Map</div>
              {overcrowded && <span style={{ background: `${C.danger}22`, border: `1px solid ${C.danger}44`, color: C.danger, fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>OVERCROWDED</span>}
            </div>
            <BedMap bed={activeBed}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: C.textMuted, fontSize: 11, marginTop: 8 }}>
              <span>30cm grid · {activeBed.areaM2}m² bed</span>
              <span>{activeBed.plants.reduce((s, p) => s + p.count, 0)} plants placed</span>
            </div>
          </div>

          {/* Crop assignments */}
          <div style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: '16px', marginBottom: 16 }}>
            <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Crops in This Bed</div>

            {activeBed.plants.length === 0 && (
              <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                No crops assigned yet. Add crops below.
              </div>
            )}

            {activeBed.plants.map(({ cropKey, count }) => {
              const crop = CROP_MAP[cropKey]; if (!crop) return null
              const max = calcMaxPlants(activeBed, crop)
              const y = calcYield(crop, count)
              const over = count > max
              return (
                <div key={cropKey} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <img src={crop.image} alt={crop.name} style={{ width: 36, height: 36, objectFit: 'contain', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 4 }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.cream, fontSize: 13, fontWeight: 600 }}>{crop.name}</div>
                    <div style={{ color: over ? C.danger : C.textMuted, fontSize: 10, marginTop: 2 }}>
                      {over ? `⚠ ${count} plants (max ${max} recommended)` : `Fits ${max} · Harvest: ${y.min}–${y.max}kg`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => adjustCount(cropKey, -1)} style={{ width: 28, height: 28, borderRadius: 7, background: C.bark2, border: `1px solid ${C.cardBorder}`, color: C.cream, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ color: C.gold, fontSize: 15, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{count}</span>
                    <button onClick={() => adjustCount(cropKey, 1)} style={{ width: 28, height: 28, borderRadius: 7, background: C.bark2, border: `1px solid ${C.cardBorder}`, color: C.cream, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    <button onClick={() => removeCropFromBed(cropKey)} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(192,64,64,0.1)', border: `1px solid rgba(192,64,64,0.2)`, color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconTrash/></button>
                  </div>
                </div>
              )
            })}

            {/* Add crop to bed */}
            {selectedCrops.length === 0 ? (
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 12 }}>Select crops in the Crops tab first.</div>
            ) : availableCrops.length > 0 ? (
              <div style={{ marginTop: 14 }}>
                {!showAddCropModal ? (
                  <button onClick={() => setShowAddCropModal(true)} style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'transparent', border: `1.5px dashed ${C.fern}`, color: C.leaf, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <IconPlus/> Add Crop to Bed
                  </button>
                ) : (
                  <div>
                    <div style={{ color: C.textSecondary, fontSize: 12, marginBottom: 8 }}>Choose a crop to add:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {availableCrops.map(k => {
                        const c = CROP_MAP[k]; if (!c) return null
                        const max = calcMaxPlants(activeBed, c)
                        return (
                          <button key={k} onClick={() => addCropToBed(k)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.bark2, border: `1px solid ${C.cardBorder}`, borderRadius: 10, textAlign: 'left' }}>
                            <img src={c.image} alt={c.name} style={{ width: 32, height: 32, objectFit: 'contain' }}/>
                            <div>
                              <div style={{ color: C.cream, fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                              <div style={{ color: C.textMuted, fontSize: 10 }}>{c.season} · fits {max} plants · {c.plantSpacingCm}cm spacing</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <button onClick={() => setShowAddCropModal(false)} style={{ width: '100%', marginTop: 8, padding: '8px', borderRadius: 8, background: C.bark2, border: `1px solid ${C.cardBorder}`, color: C.textMuted, fontSize: 12 }}>Cancel</button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Harvest estimate */}
          {harvestLines.length > 0 && (
            <div style={{ background: `linear-gradient(135deg, ${C.moss} 0%, ${C.bark} 100%)`, border: `1px solid rgba(139,195,74,0.25)`, borderRadius: 14, padding: '14px' }}>
              <div style={{ color: C.sprout, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Estimated Harvest</div>
              {harvestLines.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < harvestLines.length - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none' }}>
                  <span style={{ color: C.parchment, fontSize: 13 }}>{h.name}</span>
                  <span style={{ color: C.lime, fontSize: 13, fontWeight: 700 }}>{h.min}–{h.max} kg</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── CALENDAR ICS EXPORT ──────────────────────────────────────────────────────
function plantingMonthForCrop(crop: Crop): number | null {
  // Southern-hemisphere NZ months
  const map: Record<string, number> = {
    'Summer': 10, 'Spring–Summer': 9, 'Spring': 8,
    'Autumn–Winter': 3, 'Year-round': new Date().getMonth() + 1,
    'Winter': 4, 'Spring–Autumn': 9,
  }
  return map[crop.season] ?? null
}

function generateICS(region: string, selectedCrops: string[]): string {
  const now = new Date()
  const lines: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//Patch Planner NZ//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:Patch Planner NZ – ${region}`,
  ]

  // Monthly task events for next 3 months
  for (let offset = 0; offset < 3; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    const tasks = MONTHLY_TASKS[month] || []
    tasks.forEach((task, idx) => {
      const ds = `${year}${String(month).padStart(2, '0')}01`
      lines.push(
        'BEGIN:VEVENT',
        `UID:pp-task-${year}-${month}-${idx}@patchplanner.nz`,
        `DTSTART;VALUE=DATE:${ds}`, `DTEND;VALUE=DATE:${ds}`,
        `SUMMARY:🌱 ${task}`,
        `DESCRIPTION:${region} garden task – Patch Planner NZ`,
        'CATEGORIES:GARDENING', 'END:VEVENT',
      )
    })
  }

  // Crop planting reminders
  selectedCrops.forEach(k => {
    const crop = CROP_MAP[k]; if (!crop) return
    const pm = plantingMonthForCrop(crop); if (!pm) return
    const year = now.getMonth() + 1 > pm ? now.getFullYear() + 1 : now.getFullYear()
    const ds = `${year}${String(pm).padStart(2, '0')}01`
    lines.push(
      'BEGIN:VEVENT',
      `UID:pp-crop-${k}-${year}-${pm}@patchplanner.nz`,
      `DTSTART;VALUE=DATE:${ds}`, `DTEND;VALUE=DATE:${ds}`,
      `SUMMARY:Plant ${crop.name}`,
      `DESCRIPTION:${crop.tip} | Spacing: ${crop.plantSpacingCm}cm | ${crop.frostSensitive ? 'Frost sensitive — plant after last frost.' : 'Frost tolerant.'}`,
      'CATEGORIES:GARDENING,PLANTING', 'END:VEVENT',
    )
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

// ─── JOURNAL TAB ──────────────────────────────────────────────────────────────
function JournalTab({ entries, setEntries, selectedCrops }: {
  entries: JournalEntry[]; setEntries: (e: JournalEntry[]) => void; selectedCrops: string[]
}) {
  const [text, setText] = useState('')
  const [taggedCrops, setTaggedCrops] = useState<string[]>([])

  const addEntry = () => {
    if (!text.trim()) return
    setEntries([{ id: newId(), date: new Date().toISOString(), text: text.trim(), crops: taggedCrops }, ...entries])
    setText('')
    setTaggedCrops([])
  }

  const toggleCrop = (key: string) =>
    setTaggedCrops(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  return (
    <div style={{ padding: '0 16px 100px' }}>
      {/* New entry */}
      <div style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: '16px', marginBottom: 20 }}>
        <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>New Entry</div>
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          placeholder="What happened in the garden today? Harvests, observations, problems, notes…"
          style={{ width: '100%', background: C.bark2, border: `1px solid ${C.cardBorder}`, borderRadius: 10, color: C.cream, padding: '12px', fontSize: 13, resize: 'none', minHeight: 100, lineHeight: 1.6 }}
        />
        {selectedCrops.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tag crops</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedCrops.map(k => {
                const c = CROP_MAP[k]; if (!c) return null
                const on = taggedCrops.includes(k)
                return (
                  <button key={k} onClick={() => toggleCrop(k)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: on ? C.moss : C.bark2, border: `1px solid ${on ? C.leaf : C.cardBorder}`, color: on ? C.lime : C.textSecondary, fontSize: 11 }}>
                    <img src={c.image} alt={c.name} style={{ width: 16, height: 16 }}/>
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <button onClick={addEntry} disabled={!text.trim()} style={{ marginTop: 12, width: '100%', padding: '11px', borderRadius: 10, background: !text.trim() ? C.bark2 : C.fern, color: !text.trim() ? C.textMuted : C.lime, fontWeight: 700, fontSize: 13, border: `1px solid ${!text.trim() ? C.cardBorder : C.leaf}` }}>
          Save Entry
        </button>
      </div>

      {/* Log */}
      <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
        Garden Log {entries.length > 0 && `(${entries.length})`}
      </div>

      {entries.length === 0 && (
        <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '40px 20px', fontStyle: 'italic', lineHeight: 1.7 }}>
          No entries yet.<br/>Start recording your garden observations above.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map(entry => (
          <div key={entry.id} style={{ background: C.bark, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ color: C.gold, fontSize: 11 }}>{fmtDate(entry.date)}</div>
              <button onClick={() => setEntries(entries.filter(e => e.id !== entry.id))} style={{ background: 'rgba(192,64,64,0.1)', border: `1px solid rgba(192,64,64,0.2)`, borderRadius: 6, padding: '4px 6px', color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconTrash/>
              </button>
            </div>
            <div style={{ color: C.parchment, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{entry.text}</div>
            {entry.crops.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                {entry.crops.map(k => {
                  const c = CROP_MAP[k]; if (!c) return null
                  return (
                    <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', background: 'rgba(45,74,30,0.4)', border: `1px solid rgba(90,158,56,0.2)`, borderRadius: 12, fontSize: 10, color: C.sprout }}>
                      <img src={c.image} alt={c.name} style={{ width: 12, height: 12 }}/>
                      {c.name}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function PatchPlannerApp() {
  const [hydrated, setHydrated] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'crops' | 'care' | 'patch' | 'journal'>('home')
  const [region, setRegion] = useState('Canterbury')
  const [householdSize, setHouseholdSize] = useState(2)
  const [selectedCrops, setSelectedCrops] = useState<string[]>(['tomato', 'silverbeet', 'carrot'])
  const [beds, setBeds] = useState<Bed[]>(DEFAULT_BEDS)
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const weatherAbortRef = useRef<AbortController | null>(null)

  // Hydrate from localStorage
  useEffect(() => {
    const saved = loadState()
    if (saved) {
      if (saved.region) setRegion(saved.region)
      if (saved.householdSize) setHouseholdSize(saved.householdSize)
      if (saved.selectedCrops) setSelectedCrops(saved.selectedCrops)
      if (saved.beds?.length) setBeds(saved.beds)
      if (saved.journalEntries?.length) setJournalEntries(saved.journalEntries)
    }
    setHydrated(true)
  }, [])

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (!hydrated) return
    saveState({ region, householdSize, selectedCrops, beds, journalEntries })
  }, [hydrated, region, householdSize, selectedCrops, beds, journalEntries])

  // Fetch weather when region changes
  const fetchWeather = useCallback(async (reg: string) => {
    if (weatherAbortRef.current) weatherAbortRef.current.abort()
    const controller = new AbortController()
    weatherAbortRef.current = controller
    setWeatherLoading(true)
    setWeatherError(null)
    try {
      const res = await fetch(`/api/weather?region=${encodeURIComponent(reg)}`, { signal: controller.signal })
      if (!res.ok) throw new Error('Weather fetch failed')
      const data: WeatherData = await res.json()
      setWeather(data)
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return
      setWeatherError('Weather unavailable')
    } finally {
      setWeatherLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    fetchWeather(region)
  }, [region, hydrated, fetchWeather])

  const handleExportCalendar = useCallback(() => {
    const ics = generateICS(region, selectedCrops)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `patch-planner-${region.toLowerCase().replace(/[\s/]+/g, '-')}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }, [region, selectedCrops])

  const tabs = [
    { key: 'home' as const, label: 'Home', icon: <IconHome/> },
    { key: 'crops' as const, label: 'Crops', icon: <IconSeed/> },
    { key: 'care' as const, label: 'Care', icon: <IconBug/> },
    { key: 'patch' as const, label: 'Patch', icon: <IconGrid/> },
    { key: 'journal' as const, label: 'Journal', icon: <IconBook/> },
  ]

  const scrollAreaStyle: React.CSSProperties = { overflowY: 'auto', height: 'calc(100dvh - 120px)', paddingTop: 8 }

  return (
    <div id="root-app">
      {/* Header */}
      <header style={{ background: `linear-gradient(180deg, ${C.bark} 0%, ${C.soil} 100%)`, borderBottom: `1px solid rgba(200,168,75,0.2)`, padding: '12px 16px 10px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Logo mark */}
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill={C.moss} stroke={C.gold} strokeWidth="1.5"/>
              <path d="M20 30 Q16 20 18 10 Q20 8 22 10 Q24 20 20 30Z" fill={C.leaf}/>
              <path d="M20 28 Q12 22 10 14 Q14 12 17 18 Q19 24 20 28Z" fill={C.sprout} opacity="0.8"/>
              <path d="M20 28 Q28 22 30 14 Q26 12 23 18 Q21 24 20 28Z" fill={C.sprout} opacity="0.8"/>
            </svg>
            <div>
              <div style={{ color: C.gold, fontWeight: 700, fontSize: 16, letterSpacing: '0.01em', lineHeight: 1 }}>Patch Planner</div>
              <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: '0.08em' }}>AOTEAROA NEW ZEALAND</div>
            </div>
          </div>
          {/* Region selector */}
          <select value={region} onChange={e => setRegion(e.target.value)} style={{ background: C.bark2, border: `1px solid ${C.cardBorder}`, borderRadius: 8, color: C.parchment, padding: '6px 10px', fontSize: 12, maxWidth: 150 }}>
            {REGIONS.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
          </select>
        </div>
      </header>

      {/* Tab content */}
      <div style={scrollAreaStyle}>
        {activeTab === 'home' && (
          <HomeTab region={region} setRegion={setRegion} householdSize={householdSize} setHouseholdSize={setHouseholdSize} selectedCrops={selectedCrops} beds={beds} weather={weather} weatherLoading={weatherLoading} weatherError={weatherError} onExportCalendar={handleExportCalendar}/>
        )}
        {activeTab === 'crops' && (
          <CropsTab selectedCrops={selectedCrops} setSelectedCrops={setSelectedCrops} householdSize={householdSize}/>
        )}
        {activeTab === 'care' && (
          <CareTab selectedCrops={selectedCrops}/>
        )}
        {activeTab === 'patch' && (
          <PatchTab beds={beds} setBeds={setBeds} selectedCrops={selectedCrops}/>
        )}
        {activeTab === 'journal' && (
          <JournalTab entries={journalEntries} setEntries={setJournalEntries} selectedCrops={selectedCrops}/>
        )}
      </div>

      {/* Bottom navigation */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: `linear-gradient(0deg, ${C.bark} 0%, ${C.soil} 100%)`, borderTop: `1px solid rgba(200,168,75,0.2)`, display: 'flex', zIndex: 100 }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 0 14px', background: 'transparent', color: activeTab === tab.key ? C.lime : C.textMuted, transition: 'color 0.15s', borderTop: `2px solid ${activeTab === tab.key ? C.leaf : 'transparent'}` }}>
            {tab.icon}
            <span style={{ fontSize: 10, fontWeight: activeTab === tab.key ? 700 : 400, letterSpacing: '0.05em' }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
