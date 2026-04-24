import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import api from '../../api/client'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import { PlusIcon } from '@heroicons/react/24/outline'

const ROLES = ['admin', 'manager', 'dispatcher', 'technician']

export default function Settings() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { role: 'technician' },
  })

  const createMut = useMutation({
    mutationFn: (body) => api.post('/users', body).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['users']); setShowNew(false); reset() },
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/users/${id}`, { is_active }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries(['users']),
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage users and roles</p>
      </div>

      {/* New user form */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Team Members</h2>
          <Button onClick={() => setShowNew(v => !v)}>
            <PlusIcon className="h-4 w-4" /> Add User
          </Button>
        </div>

        {showNew && (
          <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="mb-5 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Full Name *" error={errors.name?.message} {...register('name', { required: 'Required' })} />
              <Input label="Email *" type="email" error={errors.email?.message} {...register('email', { required: 'Required' })} />
              <Input label="Password *" type="password" error={errors.password?.message} {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Role</label>
                <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" {...register('role')}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <Input label="Phone" {...register('phone')} />
              <Input label="Territory" placeholder="e.g. Sydney CBD" {...register('territory')} />
            </div>
            {createMut.isError && <p className="text-sm text-red-500">{createMut.error?.response?.data?.detail ?? 'Error creating user'}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? 'Creating…' : 'Create User'}</Button>
              <Button variant="secondary" type="button" onClick={() => { setShowNew(false); reset() }}>Cancel</Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="pb-3">Name</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Status</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 font-medium text-slate-800">{u.name}</td>
                  <td className="py-3 text-slate-500">{u.email}</td>
                  <td className="py-3"><Badge value={u.role} /></td>
                  <td className="py-3">
                    <span className={`text-xs font-medium ${u.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3">
                    <Button
                      variant="ghost"
                      className={`text-xs py-1 px-2 ${u.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                      onClick={() => toggleMut.mutate({ id: u.id, is_active: !u.is_active })}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Integration status */}
      <Card className="p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Integrations</h2>
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">SF</div>
            <div>
              <p className="text-sm font-medium text-slate-800">Salesforce Field Service</p>
              <p className="text-xs text-slate-400">Work Orders · Timesheets · Clients</p>
            </div>
          </div>
          <Badge value="draft" label="Not configured" />
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Set <code className="bg-slate-100 px-1 py-0.5 rounded">SF_CLIENT_ID</code> and related variables in your <code className="bg-slate-100 px-1 py-0.5 rounded">.env</code> file to activate Salesforce sync.
        </p>
      </Card>
    </div>
  )
}
