import { useEffect, useState } from 'react'
import {
  getAtemConnection,
  getAtemState,
  getAtemTally,
  setAtemProgram,
  setAtemPreview,
  atemCut,
  atemAuto,
  atemFtb,
  setUskOnAir,
  type AtemConnection,
  type AtemState,
} from '../../api.ts'

export default function AtemTab({ nodeId }: { nodeId: string }) {
  const [conn, setConn] = useState<AtemConnection | null>(null)
  const [state, setState] = useState<AtemState | null>(null)
  const [tally, setTally] = useState<Record<string, { program: boolean; preview: boolean }>>({})
  const [me, setMe] = useState(0)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const [c, s, t] = await Promise.all([
        getAtemConnection(nodeId),
        getAtemState(nodeId),
        getAtemTally(nodeId),
      ])
      setConn(c)
      setState(s)
      setTally(t)
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 2000)
    return () => clearInterval(t)
  }, [nodeId])

  async function act(fn: () => Promise<unknown>, label: string) {
    setBusy(true)
    setOk(null)
    setError(null)
    try {
      await fn()
      setOk(label)
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const inputs = state?.inputs ? Object.values(state.inputs) : []
  const meState = state?.mes?.[me]

  return (
    <div>
      {/* Connection status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: conn?.connected ? '#22c55e' : '#ef4444',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, color: '#9999b0' }}>
          {conn?.connected
            ? `Connected${conn.atem_ip ? ` — ${conn.atem_ip}` : ''}`
            : 'Not connected'}
        </span>
        {conn?.panel_ip && (
          <span style={{ fontSize: 12, color: '#6b6b7f' }}>Panel: {conn.panel_ip}</span>
        )}
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {/* ME selector */}
      {state?.mes && state.mes.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {state.mes.map((_, i) => (
            <button
              key={i}
              onClick={() => setMe(i)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: me === i ? '#8b5cf6' : '#2a2a3a',
                background: me === i ? '#2d1f4e' : '#1a1a24',
                color: me === i ? '#c4b5fd' : '#6b6b7f',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ME {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Program / Preview rows */}
      {inputs.length > 0 && (
        <>
          <SectionHeader>Program</SectionHeader>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {inputs.map((inp) => {
              const id = String(inp.id)
              const isPgm = meState?.program_source === inp.id
              const isTallyPgm = tally[id]?.program
              return (
                <SourceButton
                  key={inp.id}
                  label={inp.short_name || inp.long_name || String(inp.id)}
                  active={isPgm}
                  tally={isTallyPgm ? 'pgm' : undefined}
                  disabled={busy}
                  onClick={() => act(() => setAtemProgram(nodeId, me, inp.id), `Program → ${inp.short_name ?? inp.id}`)}
                />
              )
            })}
          </div>

          <SectionHeader>Preview</SectionHeader>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {inputs.map((inp) => {
              const id = String(inp.id)
              const isPvw = meState?.preview_source === inp.id
              const isTallyPvw = tally[id]?.preview
              return (
                <SourceButton
                  key={inp.id}
                  label={inp.short_name || inp.long_name || String(inp.id)}
                  active={isPvw}
                  tally={isTallyPvw ? 'pvw' : undefined}
                  disabled={busy}
                  onClick={() => act(() => setAtemPreview(nodeId, me, inp.id), `Preview → ${inp.short_name ?? inp.id}`)}
                />
              )
            })}
          </div>
        </>
      )}

      {/* Transition controls */}
      <SectionHeader>Transitions</SectionHeader>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button
          onClick={() => act(() => atemCut(nodeId, me), 'Cut')}
          disabled={busy}
          style={transBtn('#1e1e2a', '#e2e2e8')}
        >
          CUT
        </button>
        <button
          onClick={() => act(() => atemAuto(nodeId, me), 'Auto')}
          disabled={busy}
          style={transBtn('#1a2a1a', '#22c55e')}
        >
          AUTO
        </button>
        <button
          onClick={() => act(() => atemFtb(nodeId, me), 'Fade to Black')}
          disabled={busy}
          style={transBtn('#2a1a1a', '#ef4444')}
        >
          FTB
        </button>
      </div>

      {/* Upstream keyers */}
      {meState?.keyers && meState.keyers.length > 0 && (
        <>
          <SectionHeader>Upstream Keyers</SectionHeader>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {meState.keyers.map((keyer, i) => (
              <button
                key={i}
                onClick={() => act(() => setUskOnAir(nodeId, me, i, !keyer.on_air), `USK ${i + 1} ${keyer.on_air ? 'off' : 'on'}`)}
                disabled={busy}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: '1px solid',
                  borderColor: keyer.on_air ? '#22c55e' : '#2a2a3a',
                  background: keyer.on_air ? '#1a2a1a' : '#1a1a24',
                  color: keyer.on_air ? '#22c55e' : '#6b6b7f',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                KEY {i + 1}
              </button>
            ))}
          </div>
        </>
      )}

      {ok && <div style={{ color: '#10b981', fontSize: 13, marginTop: 8 }}>{ok}</div>}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: '#6b6b7f',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 10,
      }}
    >
      {children}
    </h3>
  )
}

function SourceButton({
  label,
  active,
  tally,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  tally?: 'pgm' | 'pvw'
  disabled: boolean
  onClick: () => void
}) {
  const borderColor = tally === 'pgm' ? '#ef4444' : tally === 'pvw' ? '#22c55e' : active ? '#8b5cf6' : '#2a2a3a'
  const bg = tally === 'pgm' ? '#2a1a1a' : tally === 'pvw' ? '#1a2a1a' : active ? '#2d1f4e' : '#1a1a24'
  const color = tally === 'pgm' ? '#ef4444' : tally === 'pvw' ? '#22c55e' : active ? '#c4b5fd' : '#9999b0'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 14px',
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        background: bg,
        color,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        minWidth: 52,
      }}
    >
      {label}
    </button>
  )
}

function transBtn(bg: string, color: string): React.CSSProperties {
  return {
    background: bg,
    border: `1px solid ${color}33`,
    borderRadius: 6,
    color,
    fontSize: 14,
    fontWeight: 700,
    padding: '10px 28px',
    cursor: 'pointer',
    letterSpacing: '0.05em',
  }
}
