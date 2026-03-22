import { useState } from 'react'
import { useCreateProgramMutation, useUpdateProgramMutation } from '../../store/apiSlice'
import Step1_PlanDetails from './Step1_PlanDetails'
import Step3_UserGroups from './Step3_UserGroups'
import Step4_KPIRules from './Step4_KPIRules'
import Step5_PayoutRules from './Step5_PayoutRules'

const STEPS = [
  'Plan Details',
  'KPI Definitions',
  'User Groups',
  'KPI Rules',
  'Payout Rules & Slabs',
  'Review & Publish',
]

export default function CreatePlan() {
  const [step, setStep] = useState(0)
  const [programId, setProgramId] = useState(null)
  const [planData, setPlanData] = useState({})

  const [createProgram] = useCreateProgramMutation()
  const [updateProgram] = useUpdateProgramMutation()

  const handlePlanUpdate = (data) => {
    setPlanData(data)
  }

  const goNext = async () => {
    // On Step 0 → Step 1: persist the program
    if (step === 0 && !programId) {
      try {
        const { banner: _b, bannerPreview: _bp, is_sales_contest: _sc, ...body } = planData
        const result = await createProgram(body).unwrap()
        setProgramId(result.id)
      } catch {
        return // stay on step if save fails
      }
    } else if (step === 0 && programId) {
      try {
        const { banner: _b2, bannerPreview: _bp2, is_sales_contest: _sc2, ...body } = planData
        await updateProgram({ id: programId, ...body }).unwrap()
      } catch {
        return
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goPrev = () => setStep((s) => Math.max(s - 1, 0))

  const renderStep = () => {
    switch (step) {
      case 0:
        return <Step1_PlanDetails data={planData} onUpdate={handlePlanUpdate} />
      case 1:
        return (
          <Step4_KPIRules
            programId={programId}
            onNext={() => setStep(2)}
          />
        )
      case 2:
        return <Step3_UserGroups programId={programId} />
      case 3:
        return (
          <Step4_KPIRules
            programId={programId}
            onNext={() => setStep(4)}
          />
        )
      case 4:
        return <Step5_PayoutRules programId={programId} />
      case 5:
        return (
          <div className="rounded-lg border border-gray-200 bg-white p-6 font-[Inter]">
            <h2 className="text-lg font-semibold text-teal-700">Review &amp; Publish</h2>
            <p className="mt-2 text-sm text-gray-500">
              Review all configuration before publishing the plan.
            </p>
            <pre className="mt-4 max-h-64 overflow-auto rounded bg-gray-50 p-4 text-xs text-gray-600">
              {JSON.stringify(planData, null, 2)}
            </pre>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="font-[Inter]">
      <h1 className="text-2xl font-semibold text-gray-800">Create Plan</h1>

      {/* Step indicator */}
      <nav className="mt-6 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={`rounded-full px-4 py-1 text-sm transition ${
              i === step
                ? 'bg-teal-600 text-white'
                : i < step
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </nav>

      {/* Step content */}
      <div className="mt-8">{renderStep()}</div>

      {/* Navigation buttons */}
      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <button
            onClick={goPrev}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Previous
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button
            onClick={goNext}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700"
          >
            Next
          </button>
        )}
        {step === STEPS.length - 1 && (
          <button
            className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700"
          >
            Publish Plan
          </button>
        )}
      </div>
    </div>
  )
}
