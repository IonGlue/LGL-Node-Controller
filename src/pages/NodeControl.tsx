import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Activity } from 'lucide-react'
import { fetchNodes, type NodeSummary } from '../api.ts'
import StatusTab from '../components/tabs/StatusTab.tsx'
import ConfigTab from '../components/tabs/ConfigTab.tsx'
import DisplayTab from '../components/tabs/DisplayTab.tsx'
import ScopeTab from '../components/tabs/ScopeTab.tsx'
import DecimatorTab from '../components/tabs/DecimatorTab.tsx'
import AtemTab from '../components/tabs/AtemTab.tsx'
import SystemTab from '../components/tabs/SystemTab.tsx'

interface TabDef {
  id: string
  label: string
  section: string
  component: React.ComponentType<{ nodeId: string }>
  comingSoon?: boolean
}

const ALL_TABS: TabDef[] = [
  { id: 'status', label: 'Status', section: 'status', component: StatusTab },
  { id: 'config', label: 'Config', section: 'config', component: ConfigTab },
  { id: 'display', label: 'Display', section: 'display', component: DisplayTab },
  { id: 'scope', label: 'Scope', section: 'scope', component: ScopeTab },
  { id: 'decimator', label: 'Decimator', section: 'decimator', component: DecimatorTab },
  { id: 'atem', label: 'ATEM', section: 'atem', component: AtemTab },
  { id: 'system', label: 'System', section: 'system', component: SystemTab },
]

export default function NodeControl() {
  const { nodeId } = useParams<{ nodeId: string }>()
  const [node, setNode] = useState<NodeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('status')

  useEffect(() => {
    if (!nodeId) return
    fetchNodes()
      .then((list) => {
        const found = list.find((n) => n.id === nodeId) ?? null
        setNode(found)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [nodeId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6b7f' }}>
        Loading…
      </div>
    )
  }

  if (!node || !nodeId) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: '#f87171' }}>Node not found.</div>
        <Link to="/" style={{ color: '#8b5cf6', fontSize: 14 }}>← Back to dashboard</Link>
      </div>
    )
  }

  const allowedSections = node.config.allowed_sections ?? ['status']
  const visibleTabs = ALL_TABS.filter((t) => allowedSections.includes(t.section))
  const currentTab = visibleTabs.find((t) => t.id === activeTab) ?? visibleTabs[0]
  const TabComponent = currentTab?.component

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f14', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 24px',
          borderBottom: '1px solid #1e1e2a',
          background: '#141418',
          gap: 14,
        }}
      >
        <Link to="/" style={{ color: '#6b6b7f', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={16} />
        </Link>
        <Activity size={16} color="#8b5cf6" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>{node.name}</div>
          <div style={{ fontSize: 12, color: '#6b6b7f' }}>{node.model || 'Unknown model'}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          padding: '0 24px',
          background: '#141418',
          borderBottom: '1px solid #1e1e2a',
          overflowX: 'auto',
        }}
      >
        {visibleTabs.map((tab) => {
          const isActive = currentTab?.id === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
                color: isActive ? '#c4b5fd' : '#6b6b7f',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                padding: '12px 16px',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {tab.label}
              {tab.comingSoon && (
                <span
                  style={{
                    fontSize: 10,
                    background: '#2a2a3a',
                    borderRadius: 4,
                    padding: '1px 5px',
                    color: '#6b6b7f',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  soon
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, padding: '28px 24px', maxWidth: 820 }}>
        {TabComponent && <TabComponent nodeId={nodeId} />}
      </div>
    </div>
  )
}
