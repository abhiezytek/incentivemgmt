import { useState, useRef } from 'react'
import {
  useGetProgramsQuery,
  useUploadPerformanceDataMutation,
  useCalculateIncentiveMutation,
} from '../../store/apiSlice'

/**
 * Simple CSV parser — splits on commas (no quoted-field support).
 * Returns an array of objects keyed by the header row.
 */
function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? ''
    })
    return obj
  })
}

export default function UploadPerformance() {
  const { data: programs = [] } = useGetProgramsQuery()
  const [upload] = useUploadPerformanceDataMutation()
  const [calculate] = useCalculateIncentiveMutation()

  const fileRef = useRef(null)
  const [programId, setProgramId] = useState('')
  const [period, setPeriod] = useState('')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [uploadedUsers, setUploadedUsers] = useState([])
  const [uploadCount, setUploadCount] = useState(0)

  const [isCalculating, setIsCalculating] = useState(false)
  const [calcProgress, setCalcProgress] = useState({ done: 0, total: 0 })
  const [calcResults, setCalcResults] = useState([])

  const [error, setError] = useState('')

  /* ── drag-and-drop handlers ───────────────────────────────────────── */
  const onDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }
  const onDragLeave = () => setDragOver(false)
  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.name.endsWith('.csv')) {
      setFile(dropped)
      setError('')
    } else {
      setError('Please drop a .csv file.')
    }
  }
  const onFileChange = (e) => {
    const picked = e.target.files[0]
    if (picked) {
      setFile(picked)
      setError('')
    }
  }

  /* ── upload ───────────────────────────────────────────────────────── */
  const handleUpload = async () => {
    if (!file || !programId || !period) {
      setError('Please select a program, period, and CSV file.')
      return
    }
    setError('')
    setIsUploading(true)

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      if (rows.length === 0) {
        setError('CSV file is empty or has no data rows.')
        setIsUploading(false)
        return
      }

      const [year, month] = period.split('-').map(Number)
      const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const enrichedRows = rows.map((r) => ({
        ...r,
        program_id: Number(programId),
        period_start: periodStart,
        period_end: periodEnd,
      }))

      const result = await upload({ rows: enrichedRows }).unwrap()
      const userIds = [...new Set(result.rows.map((r) => r.user_id))]

      setUploadedUsers(userIds)
      setUploadCount(result.inserted)
      setUploadDone(true)
    } catch (err) {
      setError(err?.data?.error || 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  /* ── run calculation ──────────────────────────────────────────────── */
  const handleCalculate = async () => {
    if (!uploadedUsers.length || !programId || !period) return
    setIsCalculating(true)
    setCalcProgress({ done: 0, total: uploadedUsers.length })
    setCalcResults([])

    const results = []
    for (const userId of uploadedUsers) {
      try {
        const result = await calculate({
          programId: Number(programId),
          userId,
          period,
        }).unwrap()
        results.push(result)
      } catch {
        results.push({ user_id: userId, total_incentive: '—', status: 'ERROR' })
      }
      setCalcProgress((prev) => ({ ...prev, done: prev.done + 1 }))
      setCalcResults([...results])
    }

    setIsCalculating(false)
  }

  /* ── reset ────────────────────────────────────────────────────────── */
  const handleReset = () => {
    setFile(null)
    setUploadDone(false)
    setUploadedUsers([])
    setUploadCount(0)
    setCalcProgress({ done: 0, total: 0 })
    setCalcResults([])
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const progressPct =
    calcProgress.total > 0
      ? Math.round((calcProgress.done / calcProgress.total) * 100)
      : 0

  return (
    <div className="font-[Inter]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Upload Performance Data
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV file with performance data, then run incentive
          calculations.
        </p>
      </div>

      {/* ── Selector Row ───────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Program
          </label>
          <select
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            <option value="">Select a program…</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Period (YYYY-MM)
          </label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Drag-Drop Zone ─────────────────────────────────────────────── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition ${
          dragOver
            ? 'border-teal-500 bg-teal-50'
            : 'border-gray-300 bg-white hover:border-teal-400'
        }`}
      >
        <svg
          className="mb-3 h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
        {file ? (
          <p className="text-sm font-medium text-teal-700">{file.name}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">
              Drag &amp; drop a CSV file here, or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Supported format: .csv
            </p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-500">{error}</p>
      )}

      {/* ── Upload / Calculate Buttons ─────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        {!uploadDone ? (
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !file}
            className="rounded-md bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isUploading ? 'Uploading…' : 'Upload'}
          </button>
        ) : (
          <>
            <span className="text-sm font-medium text-green-600">
              ✓ {uploadCount} rows uploaded
            </span>
            <button
              type="button"
              onClick={handleCalculate}
              disabled={isCalculating}
              className="rounded-md bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {isCalculating ? 'Calculating…' : 'Run Calculation'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Reset
            </button>
          </>
        )}
      </div>

      {/* ── Progress Bar ───────────────────────────────────────────────── */}
      {calcProgress.total > 0 && (
        <div className="mb-6">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>
              {calcProgress.done} / {calcProgress.total} users calculated
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-200">
            <div
              className="h-2.5 rounded-full bg-teal-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Results Summary Table ──────────────────────────────────────── */}
      {calcResults.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-teal-600 text-white">
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Self Incentive</th>
                <th className="px-4 py-3 font-medium">Team Incentive</th>
                <th className="px-4 py-3 font-medium">Total Incentive</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calcResults.map((r, idx) => (
                <tr
                  key={r.user_id ?? idx}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                >
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {r.user_id}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.self_incentive ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.team_incentive ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {r.total_incentive ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === 'ERROR'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {r.status === 'ERROR' ? 'Error' : r.status ?? 'Calculated'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
