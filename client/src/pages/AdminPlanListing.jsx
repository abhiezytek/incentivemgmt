import { useState, useEffect } from 'react';
import { PageHeader, Button, Badge, Card, LoadingSpinner, EmptyState } from '../components/ui';

const STATUS_MAP = {
  ACTIVE: 'blue',
  DRAFT: 'yellow',
  CLOSED: 'grey',
};

export default function AdminPlanListing() {
  const [programs, setPrograms] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/programs`);
        const json = await res.json();
        setPrograms(Array.isArray(json) ? json : []);
      } catch {
        setPrograms([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = programs.filter((p) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <PageHeader
        title="Incentive Programs"
        subtitle="Manage all incentive programs and their configurations."
        actions={
          <Button variant="primary" onClick={() => window.location.href = '/plans/create'}>
            + New Program
          </Button>
        }
      />

      {/* Filter bar */}
      <Card className="mb-6 !border-l-0">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search programs…"
            className="flex-1 min-w-[200px] rounded-lg border border-border px-3 py-2 text-sm
                       focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm
                       focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </Card>

      {/* Programs */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState message="No programs found. Create a new one to get started." action={
          <Button variant="primary" onClick={() => window.location.href = '/plans/create'}>
            + New Program
          </Button>
        } />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md
                ${p.status === 'ACTIVE' ? 'border-l-4 border-l-primary border-t border-r border-b border-border' : 'border border-border'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-bold text-text-primary">{p.name}</h3>
                <Badge variant={STATUS_MAP[p.status] || 'grey'}>{p.status}</Badge>
              </div>
              <div className="space-y-1 text-xs text-text-secondary">
                {p.channel && (
                  <div className="flex items-center gap-2">
                    <Badge variant="grey">{p.channel}</Badge>
                  </div>
                )}
                <p>{p.start_date} → {p.end_date}</p>
                {p.description && <p className="text-text-muted">{p.description}</p>}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="primary">View</Button>
                <Button size="sm" variant="ghost">Edit</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
