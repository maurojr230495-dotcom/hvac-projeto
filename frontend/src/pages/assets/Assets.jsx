import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAssets, createAsset } from '../../api/assets'
import { getClients } from '../../api/clients'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { PlusIcon, WrenchScrewdriverIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { format, parseISO, isPast } from 'date-fns'

const ASSET_TYPES = [
  'split_system','ducted','vrv_vrf','chiller','cooling_tower','ahu','fcu','boiler','heat_pump','other'
]
const ASSET_LABEL = {
  split_system: 'Split System', ducted: 'Ducted', vrv_vrf: 'VRV/VRF',
  chiller: 'Chiller', cooling_tower: 'Cooling Tower', ahu: 'AHU',
  fcu: 'FCU', boiler: 'Boiler', heat_pump: 'Heat Pump', other: 'Other',
}

function AssetForm({ clients, onClose, onSave }) {
  const [form, setForm] = useState({
    client_id: '', name: '', asset_type: 'split_system',
    brand: '', model: '', serial_number: '', capacity_kw: '',
    refrigerant: '', location: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    await onSave({ ...form, client_id: parseInt(form.client_id) })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Register Asset / Equipment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700">Client *</label>
              <select required className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Asset Name *</label>
              <input required className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Rooftop Unit #1" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Type *</label>
              <select required className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.asset_type} onChange={e => set('asset_type', e.target.value)}>
                {ASSET_TYPES.map(t => <option key={t} value={t}>{ASSET_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Brand</label>
              <input className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Daikin, Mitsubishi…" value={form.brand} onChange={e => set('brand', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Model</label>
              <input className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.model} onChange={e => set('model', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Serial Number</label>
              <input className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Capacity (kW)</label>
              <input className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="12.5" value={form.capacity_kw} onChange={e => set('capacity_kw', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Refrigerant</label>
              <input className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="R-410A" value={form.refrigerant} onChange={e => set('refrigerant', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700">Location</label>
              <input className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Level 3 — Server Room" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1 justify-center">Save Asset</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Assets() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [clientFilter, setClientFilter] = useState('')
  const [search, setSearch] = useState('')

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => getAssets(),
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  const createMut = useMutation({
    mutationFn: createAsset,
    onSuccess: () => qc.invalidateQueries(['assets']),
  })

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

  const filtered = assets.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.brand?.toLowerCase().includes(q) || a.serial_number?.toLowerCase().includes(q)
    const matchClient = !clientFilter || String(a.client_id) === clientFilter
    return matchSearch && matchClient
  })

  // Stats
  const warrantyExpired = assets.filter(a => a.warranty_expiry && isPast(parseISO(a.warranty_expiry))).length
  const serviceOverdue  = assets.filter(a => a.next_service_due && isPast(parseISO(a.next_service_due))).length

  return (
    <div className="space-y-6">
      {showForm && (
        <AssetForm
          clients={clients}
          onClose={() => setShowForm(false)}
          onSave={data => createMut.mutateAsync(data)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assets & Equipment</h1>
          <p className="text-slate-500 text-sm mt-0.5">{assets.length} registered units</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <PlusIcon className="h-4 w-4" /> Register Asset
        </Button>
      </div>

      {/* Alert cards */}
      {(warrantyExpired > 0 || serviceOverdue > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {warrantyExpired > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700"><strong>{warrantyExpired}</strong> asset{warrantyExpired > 1 ? 's' : ''} with expired warranty</p>
            </div>
          )}
          {serviceOverdue > 0 && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <WrenchScrewdriverIcon className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <p className="text-sm text-orange-700"><strong>{serviceOverdue}</strong> asset{serviceOverdue > 1 ? 's' : ''} overdue for service</p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 flex flex-wrap gap-3">
        <input
          className="flex-1 min-w-48 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search name, brand, serial…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
        >
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Card>

      {/* Asset grid */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <Card className="py-16 text-center text-slate-400 text-sm">No assets found</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(asset => {
            const warrantyExp = asset.warranty_expiry && isPast(parseISO(asset.warranty_expiry))
            const serviceOvd  = asset.next_service_due && isPast(parseISO(asset.next_service_due))
            const client      = clientMap[asset.client_id]
            return (
              <Card key={asset.id} className="p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{asset.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{client?.name ?? `Client #${asset.client_id}`}</p>
                  </div>
                  <Badge value={asset.asset_type.replace('_', ' ')} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {asset.brand && <><dt className="text-slate-400">Brand</dt><dd className="text-slate-700">{asset.brand}</dd></>}
                  {asset.model && <><dt className="text-slate-400">Model</dt><dd className="text-slate-700 truncate">{asset.model}</dd></>}
                  {asset.serial_number && <><dt className="text-slate-400">S/N</dt><dd className="text-slate-700 font-mono">{asset.serial_number}</dd></>}
                  {asset.capacity_kw && <><dt className="text-slate-400">Capacity</dt><dd className="text-slate-700">{asset.capacity_kw} kW</dd></>}
                  {asset.refrigerant && <><dt className="text-slate-400">Refrigerant</dt><dd className="text-slate-700">{asset.refrigerant}</dd></>}
                  {asset.location && <><dt className="text-slate-400">Location</dt><dd className="text-slate-700 truncate">{asset.location}</dd></>}
                </dl>
                <div className="flex flex-wrap gap-2 text-xs">
                  {asset.warranty_expiry && (
                    <span className={`px-2 py-0.5 rounded-full border ${warrantyExp ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-300 text-green-700'}`}>
                      Warranty {warrantyExp ? 'expired' : 'until'} {format(parseISO(asset.warranty_expiry), 'd MMM yy')}
                    </span>
                  )}
                  {asset.next_service_due && (
                    <span className={`px-2 py-0.5 rounded-full border ${serviceOvd ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-blue-50 border-blue-300 text-blue-700'}`}>
                      Service {serviceOvd ? 'overdue' : 'due'} {format(parseISO(asset.next_service_due), 'd MMM yy')}
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
