import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cpu, Thermometer, Clock, Activity, AlertCircle, LogOut } from 'lucide-react'
import { fetchNodes, fetchNodeStatus, type NodeSummary } from '../api.ts'
import { logout } from '../auth.ts'

const POLL_INTERVAL = 3000

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: online ? '#10b981' : '#4b4b5a',
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  )
}

function NodeCard({ node }: { node: NodeSummary }) {
  const s = node.status
  const online = s != null

  return (
    <Link
      to={`/nodes/${node.id}`}
      style={{
        display: 'block',
        background: '#1a1a24',
        border: '1px solid #2a2a3a',
        borderRadius: 10,
        padding: '18px 20px',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color .15s',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#8b5cf6')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#2a2a3a')}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <StatusDot online={online} />
        <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{node.name}</span>
        {s?.mode && (
          <span
            style={{
              fontSize: 11,
              background: '#2d2d44',
              borderRadius: 4,
              padding: '2px 8px',
              color: '#a5a5bf',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {String(s.mode)}
          </span>
        )}
      </div>

      <div style={{ fontSize: 12, color: '#6b6b7f', marginBottom: 12 }}>{node.model || 'Unknown model'}</div>

      {/* Health badges */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {s?.temperature != null && (
          <Badge icon={<Thermometer size={12} />} label={`${Math.round(Number(s.temperature))}°C`} />
        )}
        {s?.cpu_percent != null && (
          <Badge icon={<Cpu size={12} />} label={`${Math.round(Number(s.cpu_percent))}%`} />
        )}
        {s?.uptime_secs != null && (
          <Badge icon={<Clock size={12} />} label={formatUptime(Number(s.uptime_secs))} />
        )}
        {!online && (
          <Badge icon={<AlertCircle size={12} />} label="Offline" warn />
        )}
      </div>
    </Link>
  )
}

function Badge({
  icon,
  label,
  warn = false,
}: {
  icon: React.ReactNode
  label: string
  warn?: boolean
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        color: warn ? '#f59e0b' : '#8b8ba0',
        background: '#24243a',
        borderRadius: 4,
        padding: '3px 8px',
      }}
    >
      {icon}
      {label}
    </span>
  )
}

function formatUptime(secs: number): string {
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${h}h ${m}m`
}

export default function Dashboard() {
  const [nodes, setNodes] = useState<NodeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function loadNodes() {
    try {
      const list = await fetchNodes()
      setNodes(list)
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function pollStatuses(list: NodeSummary[]) {
    const updated = await Promise.all(
      list.map(async (n) => {
        try {
          const { status } = await fetchNodeStatus(n.id)
          return { ...n, status }
        } catch {
          return { ...n, status: null }
        }
      }),
    )
    setNodes(updated)
  }

  useEffect(() => {
    loadNodes()
  }, [])

  useEffect(() => {
    if (nodes.length === 0) return
    const poll = () => pollStatuses(nodes)
    timerRef.current = setInterval(poll, POLL_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [nodes.length])

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f14' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #1e1e2a',
          background: '#141418',
        }}
      >
        <Activity size={18} color="#8b5cf6" style={{ marginRight: 10 }} />
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', flex: 1 }}>
          Node Controller
        </span>
        <button
          onClick={logout}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b6b7f',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
          }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>

      <div style={{ padding: '28px 24px' }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 6,
            letterSpacing: '-0.02em',
          }}
        >
          Assigned Nodes
        </h1>
        <p style={{ fontSize: 13, color: '#6b6b7f', marginBottom: 28 }}>
          Click a node to open its control panel.
        </p>

        {loading && (
          <div style={{ color: '#6b6b7f', fontSize: 14 }}>Loading…</div>
        )}

        {error && (
          <div
            style={{
              color: '#f87171',
              background: '#2a1a1a',
              border: '1px solid #3f1f1f',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && nodes.length === 0 && (
          <div style={{ color: '#6b6b7f', fontSize: 14 }}>
            No nodes are assigned to your account yet. Contact your administrator.
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {nodes.map((n) => (
            <NodeCard key={n.id} node={n} />
          ))}
        </div>
      </div>
    </div>
  )
}
