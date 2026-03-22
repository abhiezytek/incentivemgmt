import { useState } from 'react'

const STEPS = [
  'Program Details',
  'KPI Definitions',
  'Milestones',
  'Payout Rules & Slabs',
  'Qualifying Rules',
  'Review & Publish',
]

export default function CreatePlan() {
  const [step, setStep] = useState(0)

  return (
    <div>
      <h1 className="text-2xl font-semibold">Create Plan</h1>

      {/* Step indicator */}
      <nav className="mt-6 flex gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={`rounded-full px-4 py-1 text-sm ${
              i === step
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </nav>

      {/* Step content placeholder */}
      <div className="mt-8 rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium">Step {step + 1}: {STEPS[step]}</h2>
        <p className="mt-2 text-gray-500">Configure {STEPS[step].toLowerCase()} for this incentive program.</p>
      </div>

      {/* Navigation buttons */}
      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm"
          >
            Previous
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
