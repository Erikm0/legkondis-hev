import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  ArrowDown,
  ChevronRight,
  Clock3,
  Compass,
  Database,
  Filter,
  LocateFixed,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Signal,
  TrainFront,
  TriangleAlert,
  X,
} from 'lucide-react'
import { fetchTrackedVehicles } from './api'
import { H5_ROUTE, H5_STATIONS, TARGET_LICENSE_PLATE } from './data'

const REFRESH_INTERVAL = 10_000
const DEFAULT_CENTER = [47.585, 19.048]

function formatTime(timestamp) {
  if (!timestamp) return '—'
  return new Intl.DateTimeFormat('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp))
}

function relativeUpdate(lastUpdateTime) {
  if (!lastUpdateTime) return 'nincs adat'
  const seconds = Math.max(0, Math.round(Date.now() / 1000 - lastUpdateTime))
  if (seconds < 8) return 'éppen most'
  if (seconds < 60) return `${seconds} másodperce`
  return `${Math.floor(seconds / 60)} perce`
}

function getVehicleKey(vehicle) {
  return vehicle.vehicleId || vehicle.licensePlate
}

function vehicleIcon(bearing = 0, highlightKind = '') {
  const isHighlighted = Boolean(highlightKind)
  return L.divIcon({
    className: 'vehicle-marker-wrap',
    html: `<div class="vehicle-marker${isHighlighted ? ` is-target ${highlightKind}` : ''}" style="--bearing:${bearing}deg">
      ${isHighlighted ? '<div class="vehicle-pulse"></div>' : ''}
      <div class="vehicle-arrow">▲</div>
      <div class="vehicle-symbol"><span></span><span></span></div>
      ${isHighlighted ? `<div class="target-flag">${highlightKind === 'primary' ? 'KIEMELT' : 'PLUSZ'}</div>` : ''}
    </div>`,
    iconSize: isHighlighted ? [72, 72] : [44, 44],
    iconAnchor: isHighlighted ? [36, 36] : [22, 22],
  })
}

function MapController({ vehicle, follow, requestId, onManualMove }) {
  const map = useMap()

  useEffect(() => {
    map.on('dragstart', onManualMove)
    return () => map.off('dragstart', onManualMove)
  }, [map, onManualMove])

  useEffect(() => {
    if (vehicle?.location && follow) {
      map.flyTo([vehicle.location.lat, vehicle.location.lon], Math.max(map.getZoom(), 15), {
        duration: 1.2,
      })
    }
  }, [vehicle?.location?.lat, vehicle?.location?.lon, follow, map, requestId])

  return null
}

function TrainMarker({ vehicle, highlightKind = '', onSelect }) {
  const isHighlighted = Boolean(highlightKind)
  const position = [vehicle.location.lat, vehicle.location.lon]
  return (
    <Marker
      position={position}
      icon={vehicleIcon(vehicle.bearing, highlightKind)}
      zIndexOffset={isHighlighted ? 2000 : 1000}
      title={`H5 • ${vehicle.licensePlate}`}
      eventHandlers={{
        add: (event) => event.target.getElement()?.setAttribute('aria-label', `H5 jármű: ${vehicle.licensePlate}`),
        click: () => onSelect(vehicle),
      }}
    >
      <Tooltip
        direction="top"
        offset={[0, isHighlighted ? -32 : -19]}
        permanent={isHighlighted}
        className={`train-tooltip${isHighlighted ? ` target-tooltip ${highlightKind}` : ''}`}
      >
        <strong>{isHighlighted ? `★ ${vehicle.licensePlate.replaceAll('-', ' · ')}` : vehicle.licensePlate}</strong>
        <span>H5 → {vehicle.destination || vehicle.label}</span>
      </Tooltip>
    </Marker>
  )
}

const API_LABELS = {
  vehicleId: 'Járműazonosító',
  stopId: 'Megállóazonosító',
  stopSequence: 'Megálló sorszáma',
  routeId: 'Viszonylatazonosító',
  bearing: 'Haladási irány',
  'location.lat': 'Szélesség',
  'location.lon': 'Hosszúság',
  serviceDate: 'Szolgáltatási nap',
  licensePlate: 'Pályaszám',
  label: 'Kijelzett úticél',
  model: 'Járműmodell',
  deviated: 'Letért az útvonalról',
  lastUpdateTime: 'Utolsó frissítés (timestamp)',
  status: 'Menetállapot',
  congestionLevel: 'Forgalmi szint',
  vehicleRouteType: 'Járműtípus',
  stopDistancePercent: 'Haladás a megállóig',
  wheelchairAccessible: 'Akadálymentes',
  tripId: 'Menetazonosító',
  vertex: 'Vertex',
}

function flattenApiData(value, prefix = '', result = []) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    Object.entries(value).forEach(([key, child]) => {
      flattenApiData(child, prefix ? `${prefix}.${key}` : key, result)
    })
  } else {
    result.push([prefix, Array.isArray(value) ? JSON.stringify(value) : value])
  }
  return result
}

function formatApiValue(key, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Igen' : 'Nem'
  if (key === 'lastUpdateTime') return `${value} · ${formatTime(Number(value) * 1000)}`
  return String(value)
}

function ApiDetails({ vehicle }) {
  const entries = flattenApiData(vehicle.apiData || vehicle)
  return (
    <section className="api-details">
      <div className="api-details-title"><Database size={15} /> Minden API-adat <span>{entries.length} mező</span></div>
      <dl>
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt>{API_LABELS[key] || key}</dt>
            <dd>{formatApiValue(key, value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function StatusPill({ status, error }) {
  const config = error
    ? { className: 'error', label: 'Kapcsolati hiba' }
    : status === 'found'
      ? { className: 'live', label: 'Élőben' }
      : status === 'loading'
        ? { className: 'loading', label: 'Keresés…' }
        : { className: 'away', label: 'Nincs forgalomban' }

  return (
    <span className={`status-pill ${config.className}`}>
      <span className="status-dot" />
      {config.label}
    </span>
  )
}

export default function App() {
  const [vehicle, setVehicle] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [fetchedAt, setFetchedAt] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [follow, setFollow] = useState(true)
  const [locateRequest, setLocateRequest] = useState(0)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [extraHighlightedIds, setExtraHighlightedIds] = useState([])

  const refresh = useCallback(async (silent = false) => {
    const controller = new AbortController()
    if (!silent) setIsRefreshing(true)
    try {
      const result = await fetchTrackedVehicles(controller.signal)
      setVehicles(result.vehicles)
      setVehicle(result.trackedVehicle)
      const currentIds = new Set(result.vehicles.map(getVehicleKey))
      setSelectedVehicleId((current) => current && currentIds.has(current) ? current : '')
      setExtraHighlightedIds((current) => current.filter((id) => currentIds.has(id)))
      setFetchedAt(result.fetchedAt)
      setStatus(result.trackedVehicle ? 'found' : 'away')
      setError('')
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Nem sikerült frissíteni az adatokat.')
        setStatus('error')
      }
    } finally {
      setIsRefreshing(false)
    }
    return () => controller.abort()
  }, [])

  useEffect(() => {
    refresh()
    const timer = window.setInterval(() => refresh(true), REFRESH_INTERVAL)
    return () => window.clearInterval(timer)
  }, [refresh])

  const selectedVehicle = useMemo(
    () => vehicles.find((item) => getVehicleKey(item) === selectedVehicleId) || null,
    [selectedVehicleId, vehicles],
  )
  const displayVehicle = selectedVehicle || vehicle
  const progress = useMemo(() => displayVehicle?.stopDistancePercent ?? 0, [displayVehicle])
  const highlightableVehicles = useMemo(
    () => vehicles.filter((item) => item !== vehicle && !extraHighlightedIds.includes(getVehicleKey(item))),
    [extraHighlightedIds, vehicle, vehicles],
  )

  const handleLocate = useCallback(() => {
    setFollow(true)
    setLocateRequest((value) => value + 1)
  }, [])

  const handleManualMove = useCallback(() => setFollow(false), [])

  const handleVehicleSelect = useCallback((item) => {
    setSelectedVehicleId(getVehicleKey(item))
    setFollow(true)
    setLocateRequest((value) => value + 1)
  }, [])

  const handleHighlightAdd = (event) => {
    const id = event.target.value
    if (!id) return
    setExtraHighlightedIds((current) => current.includes(id) ? current : [...current, id])
    setSelectedVehicleId(id)
    setFollow(true)
    setLocateRequest((value) => value + 1)
    event.target.value = ''
  }

  const removeHighlight = (id) => {
    setExtraHighlightedIds((current) => current.filter((item) => item !== id))
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <header className="brandbar">
          <div className="brandmark" aria-hidden="true">
            <TrainFront size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="brand-name">HÉV Radar</div>
            <div className="brand-subtitle">egy különleges szerelvény nyomában</div>
          </div>
          <button
            className="icon-button refresh-button"
            onClick={() => refresh()}
            aria-label="Adatok frissítése"
            disabled={isRefreshing}
          >
            <RefreshCw size={19} className={isRefreshing ? 'spin' : ''} />
          </button>
        </header>

        <section className="tracker-intro">
          <div className="eyebrow"><Signal size={14} /> CÉLSZERELVÉNY</div>
          <div className="plate-number" aria-label={TARGET_LICENSE_PLATE}>
            {TARGET_LICENSE_PLATE.split('-').map((part, index) => (
              <Fragment key={`${part}-${index}`}>{index > 0 && <i />}<span>{part}</span></Fragment>
            ))}
          </div>
          <div className="route-line">
            <span className="route-badge">H5</span>
            <span>Szentendre</span>
            <ChevronRight size={15} />
            <span>Batthyány tér</span>
          </div>
        </section>

        <section className="highlight-filter">
          <div className="filter-heading">
            <span><Filter size={14} /> Ideiglenes kiemelések</span>
            <small>{extraHighlightedIds.length}</small>
          </div>
          <label className="vehicle-select-wrap">
            <Plus size={16} />
            <select defaultValue="" onChange={handleHighlightAdd} aria-label="További HÉV kiemelése">
              <option value="">Szerelvény hozzáadása…</option>
              {highlightableVehicles.map((item) => (
                <option key={getVehicleKey(item)} value={getVehicleKey(item)}>
                  {item.licensePlate} → {item.destination || item.label}
                </option>
              ))}
            </select>
          </label>
          {extraHighlightedIds.length > 0 && (
            <div className="highlight-chips">
              {extraHighlightedIds.map((id) => {
                const item = vehicles.find((candidate) => getVehicleKey(candidate) === id)
                if (!item) return null
                return (
                  <div className="highlight-chip" key={id}>
                    <button onClick={() => handleVehicleSelect(item)}>{item.licensePlate}</button>
                    <button onClick={() => removeHighlight(id)} aria-label={`${item.licensePlate} kiemelésének törlése`}>
                      <X size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="status-card">
          <div className="status-card-head">
            <StatusPill status={displayVehicle ? 'found' : status} error={error} />
            <span className="updated-at">Frissítve: {formatTime(fetchedAt)}</span>
            {selectedVehicle && (
              <button className="close-details" onClick={() => setSelectedVehicleId('')} aria-label="Járműadatlap bezárása">
                <X size={15} />
              </button>
            )}
          </div>

          {displayVehicle ? (
            <div className="vehicle-info">
              <div className="destination-block">
                <span className="label">{selectedVehicle ? 'Kiválasztott szerelvény' : 'Célszerelvény'} · Úticél</span>
                <h1>{displayVehicle.destination || displayVehicle.label}</h1>
                <div className="selected-plate">{displayVehicle.licensePlate}</div>
                <p><Navigation size={16} /> {relativeUpdate(displayVehicle.lastUpdateTime)} frissült</p>
              </div>

              <div className="progress-block">
                <div className="progress-caption">
                  <span>{displayVehicle.status === 'STOPPED_AT' ? 'Az állomáson' : 'Úton a következő megállóhoz'}</span>
                  <strong>{progress}%</strong>
                </div>
                <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
                <div className="next-stop">
                  <span className="stop-icon"><MapPin size={17} /></span>
                  <div><small>Következő megálló</small><strong>{displayVehicle.stopName || 'H5 megálló'}</strong></div>
                </div>
              </div>

              <div className="data-grid">
                <div><Compass size={18} /><span><small>Haladási irány</small><strong>{Math.round(displayVehicle.bearing)}°</strong></span></div>
                <div><Clock3 size={18} /><span><small>Járműazonosító</small><strong>{displayVehicle.licensePlate}</strong></span></div>
              </div>
              <ApiDetails vehicle={displayVehicle} />
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-illustration">
                {error ? <TriangleAlert size={38} /> : <TrainFront size={42} />}
              </div>
              <h1>{error ? 'Az élő adat most nem elérhető' : 'A szerelvény most pihen'}</h1>
              <p>
                {error
                  ? error
                  : `A ${TARGET_LICENSE_PLATE} jelenleg nem szerepel a H5 vonalán közlekedő járművek között.`}
              </p>
              {!error && vehicles.length > 0 && (
                <div className="fleet-note">
                  <span className="fleet-dots"><i /><i /><i /></span>
                  {vehicles.length} másik H5-ös szerelvény követhető a térképen
                </div>
              )}
              <button className="primary-button" onClick={() => refresh()} disabled={isRefreshing}>
                <RefreshCw size={17} className={isRefreshing ? 'spin' : ''} />
                Újra ellenőrzöm
              </button>
              <span className="auto-refresh">Az oldal 10 másodpercenként automatikusan frissít.</span>
            </div>
          )}
        </section>

        <footer className="sidebar-footer">
          <span>Adatforrás: BKK FUTÁR</span>
          <span className="separator">•</span>
          <span>{TARGET_LICENSE_PLATE}</span>
        </footer>
      </aside>

      <section className="map-panel" aria-label="A H5 HÉV térképe">
        <div className="map-overlay-title">
          <span className="route-badge large">H5</span>
          <div><strong>Szentendrei HÉV</strong><small>{vehicles.length} szerelvény élőben</small></div>
        </div>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          minZoom={10}
          zoomControl={false}
          className="map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <Polyline positions={H5_ROUTE} pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.88 }} />
          <Polyline positions={H5_ROUTE} pathOptions={{ color: '#81256f', weight: 6, opacity: 1 }} />
          {H5_STATIONS.map((station, index) => (
            <CircleMarker
              key={station.name}
              center={station.position}
              radius={index === 0 || index === H5_STATIONS.length - 1 ? 5 : 3.5}
              pathOptions={{ color: '#81256f', fillColor: '#fff', fillOpacity: 1, weight: 2 }}
            >
              <Tooltip direction="right" offset={[8, 0]}>{station.name}</Tooltip>
            </CircleMarker>
          ))}
          {vehicles.map((currentVehicle) => (
            <TrainMarker
              key={currentVehicle.vehicleId || currentVehicle.licensePlate}
              vehicle={currentVehicle}
              highlightKind={
                currentVehicle === vehicle
                  ? 'primary'
                  : extraHighlightedIds.includes(getVehicleKey(currentVehicle)) ? 'extra' : ''
              }
              onSelect={handleVehicleSelect}
            />
          ))}
          <MapController
            vehicle={displayVehicle}
            follow={follow}
            requestId={locateRequest}
            onManualMove={handleManualMove}
          />
        </MapContainer>

        {displayVehicle && (
          <button className="locate-button" onClick={handleLocate}>
            <LocateFixed size={20} />
            Kiválasztott szerelvény követése
          </button>
        )}
        <div className="map-legend">
          <span className="legend-line" /> H5 vonala
          <span className="legend-dot" /> {vehicles.length} élő szerelvény
          {vehicle && <><span className="legend-dot target" /> kiemelt</>}
          {extraHighlightedIds.length > 0 && <><span className="legend-dot extra" /> {extraHighlightedIds.length} plusz</>}
        </div>
        <div className="mobile-hint"><ArrowDown size={16} /> Húzd le a térképhez</div>
      </section>
    </main>
  )
}
