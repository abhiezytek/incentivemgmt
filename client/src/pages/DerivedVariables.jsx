import { useState } from 'react'
import {
  useGetDerivedVariablesQuery,
  useCreateDerivedVariableMutation,
} from '../store/apiSlice'

export default function DerivedVariables() {
  const { data: variables = [], isLoading, isError } = useGetDerivedVariablesQuery()
  const [createVariable] = useCreateDerivedVariableMutation()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ var_name: '', formula: '', base_fields: [] })
  const [tagInput, setTagInput] = useState('')

  const handleCreate = async () => {
    if (!form.var_name || !form.formula) return
    await createVariable(form)
    setForm({ var_name: '', formula: '', base_fields: [] })
    setTagInput('')
    setShowModal(false)
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.base_fields.includes(tag)) {
      setForm({ ...form, base_fields: [...form.base_fields, tag] })
    }
    setTagInput('')
  }

  const removeTag = (tag) => {
    setForm({ ...form, base_fields: form.base_fields.filter((t) => t !== tag) })
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="font-[Inter]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Derived Variables</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define and manage formula-based derived variables.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Create
        </button>
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-gray-500">Loading…</p>}
      {isError && <p className="py-8 text-center text-sm text-red-500">Failed to load variables.</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-teal-600 text-white">
                <th className="px-4 py-3 font-medium">KPI Parameter Name</th>
                <th className="px-4 py-3 font-medium">Plans</th>
                <th className="px-4 py-3 font-medium">Created By</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {variables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No derived variables found. Click &quot;Create&quot; to add one.
                  </td>
                </tr>
              ) : (
                variables.map((v, idx) => (
                  <tr
                    key={v.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {v.var_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-500" />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {v.created_by ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          v.status === 'IN_USE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {v.status === 'IN_USE' ? 'In Use' : v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded border border-teal-500 px-3 py-1 text-xs text-teal-600 hover:bg-teal-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-teal-700">
              Create Derived Variable
            </h2>

            <div className="space-y-4">
              {/* Variable Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Variable Name
                </label>
                <input
                  type="text"
                  value={form.var_name}
                  onChange={(e) => setForm({ ...form, var_name: e.target.value })}
                  placeholder="e.g. collection_rate"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Formula */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Formula
                </label>
                <input
                  type="text"
                  value={form.formula}
                  onChange={(e) => setForm({ ...form, formula: e.target.value })}
                  placeholder="e.g. (collected / billed) * 100"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Base Fields (tag input) */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Base Fields
                </label>
                <div className="flex flex-wrap gap-1.5 rounded-md border border-gray-300 px-2 py-1.5 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500">
                  {form.base_fields.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-teal-500 hover:text-teal-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={addTag}
                    placeholder={form.base_fields.length === 0 ? 'Type and press Enter' : ''}
                    className="min-w-[80px] flex-1 border-none py-0.5 text-sm focus:ring-0 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowModal(false); setForm({ var_name: '', formula: '', base_fields: [] }); setTagInput('') }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
