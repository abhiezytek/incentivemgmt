import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Button, Badge } from '../../components/ui'

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

const TABS = ['All', 'Policy', 'Agent', 'Persistency', 'Product', 'Rates']

export default function UploadCenter() {
  const [activeTab, setActiveTab] = useState('All')

  const filtered = activeTab === 'All'
    ? UPLOAD_SECTIONS
    : UPLOAD_SECTIONS.filter(s => s.title.toLowerCase().includes(activeTab.toLowerCase()))

  return (
    <div>
      <PageHeader
        title="Upload Center"
        subtitle="Central hub for uploading data files. Download sample CSVs for the correct format, then navigate to the upload page for each data type."
      />

      {/* Tabs */}
      <div className="mb-6 border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
                ${activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((section) => (
          <div
            key={section.title}
            className="flex flex-col rounded-lg border border-border bg-surface p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-sm font-bold text-text-primary">{section.title}</h2>
            <p className="mt-1 flex-1 text-sm text-text-secondary">{section.description}</p>

            {/* Required columns as pills */}
            <div className="mt-3 flex flex-wrap gap-1">
              {section.columns.split(', ').slice(0, 5).map((col) => (
                <Badge key={col} variant="blue">{col}</Badge>
              ))}
              {section.columns.split(', ').length > 5 && (
                <Badge variant="grey">+{section.columns.split(', ').length - 5} more</Badge>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <a
                href={section.sampleFile}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-background"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Sample CSV
              </a>
              {section.route && (
                <Link to={section.route}>
                  <Button size="sm" variant="primary">
                    Upload
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
