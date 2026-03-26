import { PageShell, PageTitle, SectionCard, Button, StatusPill } from '../components/ui'

const CONFIG_ITEMS = [
  { key: 'POLICY_MASK_ENABLED', value: 'TRUE', description: 'Enable policy number masking for PII protection', editable: true },
  { key: 'POLICY_MASK_PATTERN', value: 'FIRST3_LAST3', description: 'Pattern used for policy number masking', editable: true },
  { key: 'HIERARCHY_SYNC_CRON', value: '0 2 * * *', description: 'Cron schedule for agent hierarchy synchronization', editable: true },
  { key: 'SFTP_POLL_CRON', value: '0 2,14 * * *', description: 'Cron schedule for Life Asia SFTP file polling', editable: true },
]

const FEATURE_FLAGS = [
  { key: 'REVIEW_ADJUSTMENTS', enabled: true, description: 'Allow manual review adjustments to incentive results' },
  { key: 'NOTIFICATIONS', enabled: true, description: 'In-app notification center' },
  { key: 'EXCEPTION_LOG', enabled: true, description: 'Aggregated exception log view' },
  { key: 'ORG_MAPPING_EDIT', enabled: false, description: 'Allow manual agent hierarchy edits' },
]

export default function Settings() {
  return (
    <PageShell>
      <PageTitle
        title="Settings"
        subtitle="System configuration, feature flags, and operational controls"
      />

      <div className="space-y-6">
        <SectionCard sectionLabel="SYSTEM CONFIGURATION" title="Configuration Parameters">
          <div className="divide-y divide-ent-border">
            {CONFIG_ITEMS.map((item) => (
              <div key={item.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ent-text">{item.key}</p>
                  <p className="mt-0.5 text-xs text-ent-muted">{item.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <code className="rounded bg-ent-bg px-2 py-1 text-xs text-ent-text">{item.value}</code>
                  {item.editable && (
                    <Button size="sm" variant="secondary">Edit</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard sectionLabel="FEATURE FLAGS" title="Feature Toggles">
          <div className="divide-y divide-ent-border">
            {FEATURE_FLAGS.map((flag) => (
              <div key={flag.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ent-text">{flag.key}</p>
                  <p className="mt-0.5 text-xs text-ent-muted">{flag.description}</p>
                </div>
                <StatusPill status={flag.enabled ? 'processed' : 'hold'}>
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </StatusPill>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  )
}
