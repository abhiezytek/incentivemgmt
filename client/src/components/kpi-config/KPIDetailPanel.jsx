import { useState, useCallback } from 'react'
import { useCreateKPIMutation, useUpdateKPIMutation } from '../../store/apiSlice'
import { RightPreviewPanel, Button, AlertPanel } from '../ui'

// TODO: The following form fields are not yet supported by the backend API
// and need to be added to POST /api/kpis and PUT /api/kpis/:id:
//   - validity_start, validity_end (date range for KPI applicability)
//   - effective_range (value range string)
//   - channel (applicable sales channel)
//   - designation (target role/designation)
//   - product_category (product classification)
//   - threshold_amount (minimum qualifying amount)
//   - prerequisite_links (dependent KPI references)
// Until then, these fields are stored in local form state only.

const INITIAL_FORM = {
  name: '',
  type: 'NUMERIC',
  frequency: 'MONTHLY',
  status: 'draft',
  validity_start: '',
  validity_end: '',
  effective_range: '',
  channel: '',
  designation: '',
  product_category: '',
  threshold_amount: '',
  prerequisite_links: '',
}

const TYPE_OPTIONS = [
  { value: 'NUMERIC', label: 'Numeric' },
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'CURRENCY', label: 'Currency' },
]

const FREQUENCY_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
]

function FormField({ label, children, required }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-ent-muted">
        {label}
        {required && <span className="text-ent-error"> *</span>}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-ent-border bg-ent-bg px-3 py-2 text-sm text-ent-text placeholder:text-ent-muted focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue'

const selectClass =
  'w-full rounded-lg border border-ent-border bg-ent-bg px-3 py-2 text-sm text-ent-text focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue'

function buildInitialForm(kpi) {
  if (!kpi) return INITIAL_FORM
  return {
    name: kpi.name || '',
    type: kpi.type || 'NUMERIC',
    frequency: kpi.frequency || 'MONTHLY',
    status: kpi.status || 'draft',
    validity_start: kpi.validity_start || '',
    validity_end: kpi.validity_end || '',
    effective_range: kpi.effective_range || '',
    channel: kpi.channel || '',
    designation: kpi.designation || '',
    product_category: kpi.product_category || '',
    threshold_amount: kpi.threshold_amount || '',
    prerequisite_links: kpi.prerequisite_links || '',
  }
}

// Parent should pass key={kpi?.id ?? 'new'} to reset form state when KPI changes
export default function KPIDetailPanel({ open, onClose, kpi, onSaved }) {
  const isEditing = Boolean(kpi?.id)
  const [form, setForm] = useState(() => buildInitialForm(kpi))
  const [feedback, setFeedback] = useState(null)

  const [createKPI, { isLoading: isCreating }] = useCreateKPIMutation()
  const [updateKPI, { isLoading: isUpdating }] = useUpdateKPIMutation()
  const isSaving = isCreating || isUpdating

  const handleChange = useCallback((field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setFeedback(null)
  }, [])

  const handleSave = async (status) => {
    if (!form.name.trim()) {
      setFeedback({ type: 'error', message: 'KPI Name is required.' })
      return
    }

    const payload = {
      name: form.name,
      type: form.type,
      frequency: form.frequency,
      status,
    }

    try {
      if (isEditing) {
        await updateKPI({ id: kpi.id, ...payload }).unwrap()
      } else {
        await createKPI(payload).unwrap()
      }
      setFeedback({ type: 'success', message: `KPI ${isEditing ? 'updated' : 'created'} successfully.` })
      onSaved?.()
      setTimeout(() => onClose?.(), 600)
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.data?.error || 'Failed to save KPI. Please try again.',
      })
    }
  }

  const handleValidate = () => {
    const issues = []
    if (!form.name.trim()) issues.push('Name is required')
    if (!form.validity_start && !form.validity_end) issues.push('Validity period is recommended')
    if (issues.length > 0) {
      setFeedback({ type: 'warning', message: `Validation: ${issues.join('; ')}` })
    } else {
      setFeedback({ type: 'success', message: 'All validations passed.' })
    }
  }

  return (
    <RightPreviewPanel
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit — ${kpi?.name}` : 'New KPI Configuration'}
      width={480}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {feedback && (
            <AlertPanel
              variant={feedback.type === 'success' ? 'success' : feedback.type === 'warning' ? 'warning' : 'error'}
              message={feedback.message}
              onDismiss={() => setFeedback(null)}
            />
          )}

          {/* Core fields */}
          <FormField label="KPI Name" required>
            <input
              type="text"
              className={inputClass}
              value={form.name}
              onChange={handleChange('name')}
              placeholder="e.g. New Business Premium"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type" required>
              <select className={selectClass} value={form.type} onChange={handleChange('type')}>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Measurement Frequency" required>
              <select className={selectClass} value={form.frequency} onChange={handleChange('frequency')}>
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Validity period */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Validity Start">
              <input
                type="date"
                className={inputClass}
                value={form.validity_start}
                onChange={handleChange('validity_start')}
              />
            </FormField>
            <FormField label="Validity End">
              <input
                type="date"
                className={inputClass}
                value={form.validity_end}
                onChange={handleChange('validity_end')}
              />
            </FormField>
          </div>

          {/* Fields below are local-only until backend API is extended (see TODO at top) */}
          <FormField label="Effective Range">
            <input
              type="text"
              className={inputClass}
              value={form.effective_range}
              onChange={handleChange('effective_range')}
              placeholder="e.g. 0 – 100%"
            />
          </FormField>

          <FormField label="Applicable Channel">
            <input
              type="text"
              className={inputClass}
              value={form.channel}
              onChange={handleChange('channel')}
              placeholder="e.g. Agency, Bancassurance"
            />
          </FormField>

          <FormField label="Target Designation">
            <input
              type="text"
              className={inputClass}
              value={form.designation}
              onChange={handleChange('designation')}
              placeholder="e.g. Branch Manager, Advisor"
            />
          </FormField>

          <FormField label="Product Category">
            <input
              type="text"
              className={inputClass}
              value={form.product_category}
              onChange={handleChange('product_category')}
              placeholder="e.g. Term Life, ULIP, Health"
            />
          </FormField>

          <FormField label="Threshold Amount">
            <input
              type="number"
              className={inputClass}
              value={form.threshold_amount}
              onChange={handleChange('threshold_amount')}
              placeholder="e.g. 100000"
            />
          </FormField>

          <FormField label="Prerequisite Links">
            <input
              type="text"
              className={inputClass}
              value={form.prerequisite_links}
              onChange={handleChange('prerequisite_links')}
              placeholder="e.g. Persistency 13M ≥ 80%"
            />
          </FormField>
        </div>

        {/* Live summary */}
        <div className="mt-4 border-t border-ent-border pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ent-muted">
            Configuration Summary
          </p>
          <div className="rounded-lg bg-ent-bg p-3 text-sm text-ent-text">
            <p>
              <span className="font-medium">{form.name || '(unnamed)'}</span>
              {' — '}
              {TYPE_OPTIONS.find((o) => o.value === form.type)?.label},{' '}
              {FREQUENCY_OPTIONS.find((o) => o.value === form.frequency)?.label}
            </p>
            {(form.validity_start || form.validity_end) && (
              <p className="mt-1 text-xs text-ent-muted">
                Validity: {form.validity_start || '?'} → {form.validity_end || '?'}
              </p>
            )}
            {form.channel && (
              <p className="mt-1 text-xs text-ent-muted">Channel: {form.channel}</p>
            )}
            {form.threshold_amount && (
              <p className="mt-1 text-xs text-ent-muted">
                Threshold: ₹{Number(form.threshold_amount).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ent-border pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleValidate}
            disabled={isSaving}
          >
            Validate Logic
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSave('draft')}
            loading={isSaving}
            disabled={isSaving}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave('active')}
            loading={isSaving}
            disabled={isSaving}
          >
            Commit Configuration
          </Button>
        </div>
      </div>
    </RightPreviewPanel>
  )
}
