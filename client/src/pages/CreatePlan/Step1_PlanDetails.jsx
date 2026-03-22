import { useCallback, useRef } from 'react'
import { useGetChannelsQuery } from '../../store/apiSlice'

const PLAN_TYPES = ['Sales Contest', 'Monthly', 'Quarterly']

export default function Step1_PlanDetails({ data, onUpdate }) {
  const { data: channels = [], isLoading: channelsLoading } = useGetChannelsQuery()
  const fileInputRef = useRef(null)

  const handleChange = useCallback(
    (field) => (e) => {
      const value =
        e.target.type === 'checkbox' ? e.target.checked : e.target.value
      onUpdate({ ...data, [field]: value })
    },
    [data, onUpdate],
  )

  const handleBannerDrop = useCallback(
    (e) => {
      e.preventDefault()
      const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0]
      if (file && file.type.startsWith('image/')) {
        onUpdate({ ...data, banner: file, bannerPreview: URL.createObjectURL(file) })
      }
    },
    [data, onUpdate],
  )

  const handleDragOver = (e) => e.preventDefault()

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 font-[Inter]">
      <h2 className="mb-6 text-lg font-semibold text-teal-700">Plan Details</h2>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Plan Name */}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Plan Name
          </label>
          <input
            type="text"
            value={data.name || ''}
            onChange={handleChange('name')}
            placeholder="Enter plan name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            rows={3}
            value={data.description || ''}
            onChange={handleChange('description')}
            placeholder="Enter plan description"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {/* Channel */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Channel
          </label>
          <select
            value={data.channel_id || ''}
            onChange={handleChange('channel_id')}
            disabled={channelsLoading}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            <option value="">Select channel</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>
        </div>

        {/* Plan Type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Plan Type
          </label>
          <select
            value={data.plan_type || ''}
            onChange={handleChange('plan_type')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            <option value="">Select type</option>
            {PLAN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            value={data.start_date || ''}
            onChange={handleChange('start_date')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            type="date"
            value={data.end_date || ''}
            onChange={handleChange('end_date')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {/* Sales Contest Toggle */}
        <div className="flex items-center gap-3 md:col-span-2">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={data.is_sales_contest || false}
              onChange={handleChange('is_sales_contest')}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
          <span className="text-sm font-medium text-gray-700">
            Sales Contest
          </span>
        </div>

        {/* Banner Upload */}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            App Banner
          </label>
          <div
            onDrop={handleBannerDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 transition hover:border-teal-400"
          >
            {data.bannerPreview ? (
              <img
                src={data.bannerPreview}
                alt="Banner preview"
                className="max-h-32 rounded object-contain"
              />
            ) : (
              <>
                <svg className="mb-2 h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0l-3 3m3-3l3 3M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-500">
                  Drag &amp; drop an image or <span className="text-teal-600 underline">browse</span>
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerDrop}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
