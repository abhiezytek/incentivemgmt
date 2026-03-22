import { useState, useRef } from 'react'
import { useUploadProductsMutation } from '../../store/apiSlice'

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

const EXPECTED_HEADERS = [
  'product_code', 'product_name', 'product_category', 'product_type',
  'min_premium', 'min_sum_assured', 'min_policy_term',
]

export default function UploadProducts() {
  const [upload] = useUploadProductsMutation()

  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [dragOver, setDragOver] = useState(false)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)
  const [productCodes, setProductCodes] = useState([])

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
      handleFileSelected(dropped)
    } else {
      setError('Please drop a .csv file.')
    }
  }
  const onFileChange = (e) => {
    const picked = e.target.files[0]
    if (picked) handleFileSelected(picked)
  }

  const handleFileSelected = async (f) => {
    setFile(f)
    setError('')
    setUploadDone(false)
    try {
      const text = await f.text()
      const rows = parseCSV(text)
      setPreview(rows.slice(0, 5))
    } catch {
      setPreview([])
    }
  }

  /* ── upload ───────────────────────────────────────────────────────── */
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file.')
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

      // Validate headers
      const headers = Object.keys(rows[0])
      const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h))
      if (missing.length) {
        setError(`Missing CSV columns: ${missing.join(', ')}`)
        setIsUploading(false)
        return
      }

      const result = await upload({ rows }).unwrap()
      const codes = [...new Set(result.rows.map((r) => r.product_code))]

      setProductCodes(codes)
      setUploadCount(result.inserted)
      setUploadDone(true)
    } catch (err) {
      setError(err?.data?.error || 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  /* ── reset ────────────────────────────────────────────────────────── */
  const handleReset = () => {
    setFile(null)
    setPreview([])
    setUploadDone(false)
    setProductCodes([])
    setUploadCount(0)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="font-[Inter]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Upload Products
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV file with product data. Records are stored in{' '}
          <code className="text-xs">ins_products</code> and used for policy
          transaction categorisation and incentive rate lookups.
        </p>
      </div>

      {/* ── Info Row ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs text-gray-400">
          CSV must include: product_code, product_name, product_category,
          product_type, min_premium, min_sum_assured, min_policy_term
        </p>
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

      {/* ── CSV Preview ────────────────────────────────────────────────── */}
      {preview.length > 0 && !uploadDone && (
        <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <p className="px-4 py-2 text-xs font-medium text-gray-500">
            Preview (first {preview.length} rows)
          </p>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50">
                {Object.keys(preview[0]).map((h) => (
                  <th key={h} className="px-3 py-2 font-medium text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.map((row, idx) => (
                <tr key={idx}>
                  {Object.values(row).map((v, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-gray-700">
                      {v || <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Upload Button / Success ────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        {!uploadDone ? (
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !file}
            className="rounded-md bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isUploading ? 'Uploading…' : 'Upload Products'}
          </button>
        ) : (
          <>
            <span className="text-sm font-medium text-green-600">
              ✓ {uploadCount} product(s) uploaded
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Upload More
            </button>
          </>
        )}
      </div>

      {/* ── Uploaded Products Summary ───────────────────────────────────── */}
      {uploadDone && productCodes.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Products Uploaded
          </h3>
          <div className="flex flex-wrap gap-2">
            {productCodes.map((code) => (
              <span
                key={code}
                className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700"
              >
                {code}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Products are now available for policy transaction categorisation and
            incentive rate lookups.
          </p>
        </div>
      )}
    </div>
  )
}
