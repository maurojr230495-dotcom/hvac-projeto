import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { getClients, createClient } from '../../api/clients'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import { PlusIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function Clients() {
  const qc = useQueryClient()
  const [search, setSearch]     = useState('')
  const [showNew, setShowNew]   = useState(false)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { country: 'AU' },
  })

  const createMut = useMutation({
    mutationFn: createClient,
    onSuccess: () => { qc.invalidateQueries(['clients']); setShowNew(false); reset() },
  })

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-0.5">{clients.length} clients on file</p>
        </div>
        <Button onClick={() => setShowNew(true)}><PlusIcon className="h-4 w-4" /> Add Client</Button>
      </div>

      {/* New client form */}
      {showNew && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">New Client</h2>
            <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-slate-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit(data => createMut.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Full Name *" placeholder="John Smith" error={errors.name?.message} {...register('name', { required: 'Required' })} />
              <Input label="Company" placeholder="Smith HVAC Pty Ltd" {...register('company')} />
              <Input label="Email" type="email" placeholder="john@example.com.au" {...register('email')} />
              <Input label="Phone" placeholder="+61 4xx xxx xxx" {...register('phone')} />
              <Input label="Address" placeholder="123 Collins St" {...register('address')} />
              <Input label="City" placeholder="Melbourne" {...register('city')} />
              <Input label="State" placeholder="VIC" {...register('state')} />
              <Input label="Postcode" placeholder="3000" {...register('postcode')} />
            </div>
            {createMut.isError && (
              <p className="text-sm text-red-500">{createMut.error?.response?.data?.detail ?? 'Error creating client'}</p>
            )}
            <div className="flex gap-3">
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? 'Saving…' : 'Save Client'}</Button>
              <Button variant="secondary" type="button" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by name, company or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-16 text-sm">No clients found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Card key={c.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                  {c.company && <p className="text-sm text-slate-500 truncate">{c.company}</p>}
                  {c.email && <p className="text-sm text-slate-400 truncate">{c.email}</p>}
                  {c.phone && <p className="text-sm text-slate-400">{c.phone}</p>}
                  {c.city && <p className="text-xs text-slate-400 mt-1">{[c.city, c.state].filter(Boolean).join(', ')}</p>}
                </div>
              </div>
              {c.salesforce_id && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400">SF: {c.salesforce_id}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
