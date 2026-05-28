import React, { useState } from 'react'

export default function URLInput({ onScan, error }) {
  const [url, setUrl] = useState('')
  const [focused, setFocused] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim()) return
    let target = url.trim()
    if (!/^https?:\/\//i.test(target)) target = 'https://' + target
    onScan(target)
  }

  const examples = [
    'https://github.com/expressjs/express',
    'https://github.com/facebook/react',
    'https://github.com/vercel/next.js',
  ]

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>

      {/* Hero */}
      <div className="fade-up" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--accent-soft)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 100,
          padding: '6px 16px',
          marginBottom: '1.5rem',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: '#a5b4fc',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse-ring 2s ease infinite' }} />
          Dependency & Complexity Scanning
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: '1.2rem',
          background: 'linear-gradient(135deg, #f1f5f9 30%, #a5b4fc 70%, #c084fc 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Audit any repository<br />in seconds
        </h1>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1.1rem',
          maxWidth: 480,
          margin: '0 auto',
          lineHeight: 1.7,
        }}>
          Instant metrics for security vulnerabilities and code cyclomatic complexity. Powered by npm audit & ESLint.
        </p>
      </div>

      {/* Input card */}
      <div className="fade-up fade-up-2" style={{ width: '100%', maxWidth: 660 }}>
        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'flex',
            gap: 0,
            background: 'var(--bg-card)',
            border: `1.5px solid ${focused ? 'rgba(99,102,241,0.6)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-xl)',
            padding: '6px 6px 6px 20px',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: focused ? '0 0 0 4px var(--accent-glow)' : 'none',
            backdropFilter: 'blur(16px)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', marginRight: 10, fontSize: '1.1rem' }}>
              🔍
            </span>
            <input
              id="url-input"
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Enter a URL to audit..."
              autoComplete="off"
              autoFocus
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontFamily: 'var(--font-sans)',
                minWidth: 0,
              }}
            />
            <button
              type="submit"
              id="scan-btn"
              disabled={!url.trim()}
              style={{
                padding: '12px 28px',
                background: url.trim()
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(255,255,255,0.05)',
                color: url.trim() ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.95rem',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                cursor: url.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                boxShadow: url.trim() ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
              }}
            >
              Scan now →
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '12px 16px',
            background: 'var(--fail-soft)',
            border: '1px solid rgba(244,63,94,0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--fail)',
            fontSize: '0.875rem',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Example links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: '1.2rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Try:</span>
          {examples.map(ex => (
            <button
              key={ex}
              onClick={() => { setUrl(ex); }}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 100,
                padding: '4px 14px',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.target.style.borderColor = 'var(--accent)'
                e.target.style.color = '#a5b4fc'
              }}
              onMouseLeave={e => {
                e.target.style.borderColor = 'var(--border)'
                e.target.style.color = 'var(--text-secondary)'
              }}
            >
              {ex.replace('https://', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Feature pills */}
      <div className="fade-up fade-up-3" style={{
        display: 'flex',
        gap: 10,
        marginTop: '4rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {[
          { icon: '📦', label: 'Git Clone' },
          { icon: '📥', label: 'Dependencies' },
          { icon: '🔒', label: 'npm audit' },
          { icon: '🧠', label: 'ESLint Complexity' },
        ].map(f => (
          <div key={f.label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 100,
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
          }}>
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
