import { useState } from 'react'
import { rebootNode, restartSystemService } from '../../api.ts'

const SERVICES = ['lgl-node', 'lgl-node-display', 'lgl-node-scope'] as const

export default function SystemTab({ nodeId }: { nodeId: string }) {
  const [confirmReboot, setConfirmReboot] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleReboot() {
    setBusy(true)
    setOk(null)
    setError(null)
    try {
      await rebootNode(nodeId)
      setOk('Reboot command sent. Node will restart shortly.')
      setConfirmReboot(false)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleRestartService(service: string) {
    setBusy(true)
    setOk(null)
    setError(null)
    try {
      await restartSystemService(nodeId, service)
      setOk(`Service "${service}" restart requested.`)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {/* Service restarts */}
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#6b6b7f',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 14,
        }}
      >
        Service Restarts
      </h3>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 36 }}>
        {SERVICES.map((svc) => (
          <button
            key={svc}
            onClick={() => handleRestartService(svc)}
            disabled={busy}
            style={{
              background: '#2a2a3a',
              border: 'none',
              borderRadius: 6,
              color: '#e2e2e8',
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 18px',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            Restart {svc}
          </button>
        ))}
      </div>

      {/* Reboot */}
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#6b6b7f',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 14,
        }}
      >
        System Reboot
      </h3>

      <div
        style={{
          background: '#1a1a24',
          border: '1px solid #3a2020',
          borderRadius: 8,
          padding: '16px 20px',
        }}
      >
        <p style={{ fontSize: 13, color: '#9999b0', marginBottom: 14 }}>
          Rebooting will disconnect the node from all active streams. Only reboot if absolutely
          necessary.
        </p>

        {!confirmReboot ? (
          <button
            onClick={() => setConfirmReboot(true)}
            style={{
              background: '#7f1d1d',
              border: 'none',
              borderRadius: 6,
              color: '#fca5a5',
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 18px',
              cursor: 'pointer',
            }}
          >
            Reboot Node
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>
              Are you sure? This cannot be undone.
            </span>
            <button
              onClick={handleReboot}
              disabled={busy}
              style={{
                background: '#dc2626',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 18px',
                cursor: 'pointer',
              }}
            >
              {busy ? 'Rebooting…' : 'Confirm Reboot'}
            </button>
            <button
              onClick={() => setConfirmReboot(false)}
              style={{
                background: '#2a2a3a',
                border: 'none',
                borderRadius: 6,
                color: '#9999b0',
                fontSize: 13,
                padding: '8px 18px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 13, marginTop: 14 }}>{error}</div>}
      {ok && <div style={{ color: '#10b981', fontSize: 13, marginTop: 14 }}>{ok}</div>}
    </div>
  )
}
