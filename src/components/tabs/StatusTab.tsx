import { useEffect, useState } from 'react'
import { getStatus, getSystemInfo, type DeviceStatus, type SystemInfo } from '../../api.ts'

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '9px 0',
        borderBottom: '1px solid #1e1e2a',
        fontSize: 13,
      }}
    >
      <span style={{ color: '#8b8ba0' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', color: '#e2e2e8' }}>{String(value ?? '—')}</span>
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
        marginTop: 24,
        marginBottom: 12,
      }}
    >
      {children}
    </h3>
  )
}

export default function StatusTab({ nodeId }: { nodeId: string }) {
  const [status, setStatus] = useState<DeviceStatus | null>(null)
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const [s, i] = await Promise.all([getStatus(nodeId), getSystemInfo(nodeId)])
      setStatus(s)
      setInfo(i)
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [nodeId])

  if (error) return <div style={{ color: '#f87171', fontSize: 14 }}>{error}</div>

  if (!status) return <div style={{ color: '#6b6b7f', fontSize: 13 }}>Loading…</div>

  const t = status.telemetry

  return (
    <div>
      {/* Connection */}
      <SectionHeader>Connection</SectionHeader>
      <Row label="Hostname" value={status.hostname} />
      <Row label="Registration" value={status.registration_state} />
      <Row label="Connection" value={status.connection} />
      {status.firmware_available && (
        <Row label="Firmware Update" value={status.firmware_available} />
      )}

      {/* Subsystems */}
      {t?.subsystems && (
        <>
          <SectionHeader>Subsystems</SectionHeader>
          {Object.entries(t.subsystems).map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '9px 0',
                borderBottom: '1px solid #1e1e2a',
                fontSize: 13,
              }}
            >
              <span style={{ color: '#8b8ba0', textTransform: 'capitalize' }}>{k}</span>
              <span
                style={{
                  fontFamily: 'monospace',
                  color: v === 'running' || v === 'active' || v === 'streaming' || v === 'connected' || v === 'adopted'
                    ? '#22c55e'
                    : '#f59e0b',
                }}
              >
                {v ?? '—'}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Encoder */}
      {t?.encoder && (
        <>
          <SectionHeader>Encoder</SectionHeader>
          <Row label="Pipeline" value={t.encoder.pipeline} />
          <Row label="Resolution" value={t.encoder.resolution} />
          <Row label="FPS" value={t.encoder.fps} />
          <Row label="Bitrate" value={t.encoder.bitrate_kbps != null ? `${t.encoder.bitrate_kbps} kbps` : undefined} />
          <Row label="Interlaced" value={t.encoder.interlaced != null ? String(t.encoder.interlaced) : undefined} />
          {t.encoder.audio_levels && (
            <Row label="Audio Levels" value={t.encoder.audio_levels.map((l) => `${l} dBFS`).join(', ')} />
          )}
        </>
      )}

      {/* Network paths */}
      {t?.paths && t.paths.length > 0 && (
        <>
          <SectionHeader>Network Paths</SectionHeader>
          {t.paths.map((p, i) => (
            <div
              key={i}
              style={{
                background: '#1a1a24',
                border: '1px solid #2a2a3a',
                borderRadius: 6,
                padding: '10px 14px',
                marginBottom: 8,
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 600, color: '#c4b5fd', marginBottom: 6 }}>{p.interface}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                <span style={{ color: '#6b6b7f' }}>Bitrate</span>
                <span style={{ fontFamily: 'monospace' }}>{p.bitrate_kbps} kbps</span>
                <span style={{ color: '#6b6b7f' }}>RTT</span>
                <span style={{ fontFamily: 'monospace' }}>{p.rtt_ms} ms</span>
                <span style={{ color: '#6b6b7f' }}>Loss</span>
                <span style={{ fontFamily: 'monospace' }}>{p.loss_pct}%</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Available interfaces */}
      {t?.available_interfaces && t.available_interfaces.length > 0 && (
        <>
          <SectionHeader>Interfaces</SectionHeader>
          {t.available_interfaces.map((iface) => (
            <div
              key={iface.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '9px 0',
                borderBottom: '1px solid #1e1e2a',
                fontSize: 13,
              }}
            >
              <span style={{ color: '#8b8ba0', fontFamily: 'monospace' }}>{iface.name}</span>
              <span style={{ fontFamily: 'monospace', color: '#e2e2e8' }}>{iface.ip}</span>
            </div>
          ))}
        </>
      )}

      {/* Capture devices */}
      {t?.available_capture_devices && t.available_capture_devices.length > 0 && (
        <>
          <SectionHeader>Capture Devices</SectionHeader>
          {t.available_capture_devices.map((d) => (
            <Row key={d.path} label={d.path} value={d.name} />
          ))}
        </>
      )}

      {/* System */}
      {(t?.system || info) && (
        <>
          <SectionHeader>System</SectionHeader>
          {t?.system ? (
            <>
              <Row label="CPU Temp" value={t.system.cpu_temp_c != null ? `${t.system.cpu_temp_c} °C` : undefined} />
              <Row label="CPU Load (1m)" value={t.system.cpu_load_1m} />
              <Row label="Memory" value={t.system.mem_used_mb != null ? `${t.system.mem_used_mb} / ${t.system.mem_total_mb} MB` : undefined} />
            </>
          ) : info ? (
            <>
              <Row label="CPU Temp" value={info.cpu_temp_c != null ? `${info.cpu_temp_c} °C` : undefined} />
              <Row label="CPU Load (1m)" value={info.cpu_load_1m} />
              <Row label="Memory" value={info.mem_used_mb != null ? `${info.mem_used_mb} / ${info.mem_total_mb} MB` : undefined} />
              <Row label="Disk" value={info.disk_used_mb != null ? `${info.disk_used_mb} / ${info.disk_total_mb} MB` : undefined} />
              <Row label="Uptime" value={info.uptime_secs != null ? `${Math.floor(info.uptime_secs / 3600)}h ${Math.floor((info.uptime_secs % 3600) / 60)}m` : undefined} />
            </>
          ) : null}
        </>
      )}

      {t?.uptime_secs != null && (
        <Row label="Uptime" value={`${Math.floor(t.uptime_secs / 3600)}h ${Math.floor((t.uptime_secs % 3600) / 60)}m`} />
      )}
    </div>
  )
}
