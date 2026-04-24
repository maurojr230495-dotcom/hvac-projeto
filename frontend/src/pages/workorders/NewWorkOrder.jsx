import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createWorkOrder } from '../../api/workorders'
import { getClients } from '../../api/clients'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

const schema = z.object({
  title:          z.string().min(3, 'Title is required'),
  client_id:      z.coerce.number({ required_error: 'Select a client' }),
  service_type:   z.string().optional(),
  priority:       z.enum(['low','medium','high','critical']),
  site_address:   z.string().optional(),
  site_city:      z.string().optional(),
  description:    z.string().optional(),
  scheduled_start: z.string().optional(),
  estimated_hours: z.coerce.number().optional(),
  hourly_rate:    z.coerce.number().optional(),
  cost_center:    z.string().optional(),
})

export default function NewWorkOrder() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  })

  const createMut = useMutation({
    mutationFn: createWorkOrder,
    onSuccess: (wo) => {
      qc.invalidateQueries(['work-orders'])
      navigate(`/work-orders/${wo.id}`)
    },
  })

  function onSubmit(data) {
    const payload = { ...data }
    if (payload.scheduled_start) payload.scheduled_start = new Date(payload.scheduled_start).toISOString()
    createMut.mutate(payload)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">New Work Order</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="Title *" placeholder="e.g. AC installation — Unit 3B" error={errors.title?.message} {...register('title')} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Client *</label>
            <select
              className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.client_id ? 'border-red-400' : 'border-slate-300'}`}
              {...register('client_id')}
            >
              <option value="">Select a client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
            </select>
            {errors.client_id && <p className="text-xs text-red-500">{errors.client_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Service Type</label>
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" {...register('service_type')}>
                <option value="">Select…</option>
                <option>install</option>
                <option>repair</option>
                <option>maintenance</option>
                <option>inspection</option>
                <option>commissioning</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Priority</label>
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" {...register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Site Address" placeholder="123 Smith St" {...register('site_address')} />
            <Input label="City" placeholder="Sydney" {...register('site_city')} />
          </div>

          <Input label="Scheduled Start" type="datetime-local" {...register('scheduled_start')} />

          <div className="grid grid-cols-3 gap-4">
            <Input label="Est. Hours" type="number" min="0" step="0.5" {...register('estimated_hours')} />
            <Input label="Hourly Rate ($)" type="number" min="0" step="0.01" {...register('hourly_rate')} />
            <Input label="Cost Centre" placeholder="CC-001" {...register('cost_center')} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={4}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the work to be performed…"
              {...register('description')}
            />
          </div>

          {createMut.isError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {createMut.error?.response?.data?.detail ?? 'Failed to create work order'}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? 'Creating…' : 'Create Work Order'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
