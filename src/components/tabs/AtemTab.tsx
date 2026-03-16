export default function AtemTab() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 0',
        color: '#6b6b7f',
        textAlign: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: '#1a1a24',
          border: '1px solid #2a2a3a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        🎬
      </div>
      <div style={{ fontWeight: 600, fontSize: 15, color: '#9999b0' }}>ATEM Control</div>
      <div style={{ fontSize: 13, maxWidth: 320, lineHeight: 1.6 }}>
        ATEM integration is coming soon. This tab will expose switcher controls once the
        device-side API is available.
      </div>
    </div>
  )
}
