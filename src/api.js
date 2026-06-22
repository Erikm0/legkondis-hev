import { TARGET_LICENSE_PLATE } from './data'

const API_URL = new URL(
  'https://go.bkk.hu/api/query/v1/ws/otp/api/where/vehicles-for-route.json',
)

const API_PARAMS = {
  related: 'false',
  routeId: 'BKK_H5',
  key: 'web-54feeb28-a942-48ae-89a5-9955879ebb2c',
  version: '4',
  appVersion: '3.18.0-251972-2069795-86d980c0',
  locale: 'hu',
}

export async function fetchTrackedVehicles(signal) {
  Object.entries(API_PARAMS).forEach(([key, value]) => API_URL.searchParams.set(key, value))
  API_URL.searchParams.set('_', Date.now().toString())

  const response = await fetch(API_URL, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error(`A BKK API ${response.status} hibával válaszolt.`)

  const payload = await response.json()
  if (payload.status !== 'OK' || !Array.isArray(payload.data?.list)) {
    throw new Error('A BKK API válasza nem a várt formátumú.')
  }

  const rawVehicles = [...payload.data.list]
  const isDemo = import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')

  if (isDemo && !rawVehicles.some(({ licensePlate = '' }) => licensePlate.includes(TARGET_LICENSE_PLATE))) {
    rawVehicles.push({
      vehicleId: `demo-${TARGET_LICENSE_PLATE}`,
      licensePlate: TARGET_LICENSE_PLATE,
      routeId: 'BKK_H5',
      bearing: 34,
      location: { lat: 47.598091, lon: 19.054599 },
      label: 'Szentendre',
      lastUpdateTime: Math.floor(Date.now() / 1000),
      status: 'IN_TRANSIT_TO',
      stopDistancePercent: 63,
      stopId: 'BKK_09183209',
      tripId: 'BKK_H41821_1',
    })
  }

  const vehicles = rawVehicles
    .filter(({ location }) => Number.isFinite(location?.lat) && Number.isFinite(location?.lon))
    .map((vehicle) => {
      const stop = payload.data.references?.stops?.[vehicle.stopId]
      const trip = payload.data.references?.trips?.[vehicle.tripId]
      return {
        ...vehicle,
        apiData: vehicle,
        stopName: stop?.name,
        destination: trip?.tripHeadsign || vehicle.label,
      }
    })

  return {
    vehicles,
    trackedVehicle: vehicles.find(({ licensePlate = '' }) =>
      licensePlate.includes(TARGET_LICENSE_PLATE),
    ) || null,
    fetchedAt: Date.now(),
  }
}
