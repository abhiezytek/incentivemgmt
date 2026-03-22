import { Link } from 'react-router-dom'

const UPLOAD_SECTIONS = [
  {
    title: 'Policy Transactions',
    description: 'Upload policy transaction records (NB, renewals) for incentive calculations.',
    route: '/data/upload-transactions',
    sampleFile: '/samples/policy_transactions.csv',
    columns: 'policy_number, agent_code, product_code, channel_code, region_code, transaction_type, policy_year, premium_amount, sum_assured, annualized_premium, payment_mode, issue_date, due_date, paid_date, policy_status',
  },
  {
    title: 'Agent Master',
    description: 'Upload agent profiles with channel, region, hierarchy, and license details.',
    route: '/data/upload-agents',
    sampleFile: '/samples/agent_master.csv',
    columns: 'agent_code, agent_name, channel_code, region_code, branch_code, license_number, license_expiry, activation_date, parent_agent_code, hierarchy_level, status',
  },
  {
    title: 'Persistency Data',
    description: 'Upload persistency records used for gate checks during approval.',
    route: '/data/upload-persistency',
    sampleFile: '/samples/persistency_data.csv',
    columns: 'agent_code, persistency_month, period_start, period_end, policies_due, policies_renewed',
  },
  {
    title: 'Product Master',
    description: 'Upload product definitions for policy categorisation and rate lookups.',
    route: '/data/upload-products',
    sampleFile: '/samples/product_master.csv',
    columns: 'product_code, product_name, product_category, product_type, min_premium, min_sum_assured, min_policy_term',
  },
  {
    title: 'Incentive Rates',
    description: 'Upload incentive rate tables by product, channel, policy year, and transaction type.',
    route: '/data/upload-rates',
    sampleFile: '/samples/incentive_rates.csv',
    columns: 'product_code, channel_code, policy_year, transaction_type, rate_type, incentive_rate, min_premium_slab, max_premium_slab, min_policy_term, max_policy_term, effective_from, effective_to',
  },
  {
    title: 'MLM Override Rates',
    description: 'Upload multi-level marketing override rate schedules by channel and hierarchy level.',
    route: null,
    sampleFile: '/samples/mlm_override_rates.csv',
    columns: 'channel_code, hierarchy_level, override_type, override_rate, min_team_size, min_team_premium, effective_from, effective_to',
  },
]

export default function UploadCenter() {
  return (
    <div className="font-[Inter]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-800">Upload Center</h1>
        <p className="mt-1 text-sm text-gray-500">
          Central hub for uploading data files. Download sample CSVs for the
          correct format, then navigate to the upload page for each data type.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {UPLOAD_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-base font-semibold text-gray-800">
              {section.title}
            </h2>
            <p className="mt-1 flex-1 text-sm text-gray-500">
              {section.description}
            </p>

            <p className="mt-3 text-xs text-gray-400">
              <span className="font-medium text-gray-500">Columns:</span>{' '}
              {section.columns}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <a
                href={section.sampleFile}
                download
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                Sample CSV
              </a>
              {section.route && (
                <Link
                  to={section.route}
                  className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                >
                  Upload
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
