import React, { useState } from 'react'

function getOverallColor(score) {
  if (score >= 90) return '#22c55e'
  if (score >= 70) return '#f59e0b'
  return '#f43f5e'
}

function OverallRing({ score }) {
  const size = 160
  const strokeWidth = 10
  const r = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * r
  const progress = ((100 - score) / 100) * circumference
  const color = getOverallColor(score)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={progress}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '2.8rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Health Score</span>
      </div>
    </div>
  )
}

export default function Report({ report, onReset }) {
  const { repoUrl, scannedAt, auditOutput, complexityErrors, eslintData, parsedFiles, skippedFiles, auditError, eslintError, aiSuggestions } = report

  // Basic scoring logic: 100 points minus deductions
  const critical = auditOutput?.metadata?.vulnerabilities?.critical || 0
  const high = auditOutput?.metadata?.vulnerabilities?.high || 0
  const totalVulns = critical + high
  
  const vulnPenalty = totalVulns * 15
  const complexityPenalty = (complexityErrors || 0) * 5
  let overallScore = 100 - vulnPenalty - complexityPenalty
  if (overallScore < 0) overallScore = 0

  const color = getOverallColor(overallScore)
  const status = overallScore >= 80 ? 'PASS' : 'FAIL'

  const getVulnList = () => {
    if (!auditOutput) return []
    if (auditOutput.vulnerabilities) {
      return Object.values(auditOutput.vulnerabilities).filter(v => 
        v.severity === 'high' || v.severity === 'critical'
      )
    }
    if (auditOutput.advisories) {
      return Object.values(auditOutput.advisories).filter(v =>
        v.severity === 'high' || v.severity === 'critical'
      )
    }
    return []
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      
      {/* Header */}
      <div className="fade-up" style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2.5rem',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>
            Repository Audit Report
          </h1>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
          }}>
            {repoUrl}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Scanned {scannedAt ? new Date(scannedAt).toLocaleString() : new Date().toLocaleString()}
          </div>
        </div>
        <button
          onClick={onReset}
          style={{
            padding: '10px 20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = '#a5b4fc' }}
          onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)' }}
        >
          ← New Scan
        </button>
      </div>

      {/* Overall hero panel */}
      <div className="glass fade-up fade-up-1" style={{
        padding: '2.5rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '3rem',
        flexWrap: 'wrap',
        boxShadow: `0 0 60px ${color}18`,
        borderColor: `${color}33`,
      }}>
        <OverallRing score={overallScore} />

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
            <span style={{
              padding: '6px 18px',
              background: status === 'PASS' ? 'var(--pass-soft)' : 'var(--fail-soft)',
              border: `1px solid ${status === 'PASS' ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.3)'}`,
              borderRadius: 100,
              color: status === 'PASS' ? 'var(--pass)' : 'var(--fail)',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
            }}>
              {status === 'PASS' ? '✓ PASS' : '✗ FAIL'}
            </span>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {overallScore >= 90
              ? 'Excellent! Your codebase is secure and maintainable.'
              : overallScore >= 70
              ? 'Good, but there are a few issues to address.'
              : 'Critical issues detected. Immediate action required.'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
            Found {totalVulns || 0} critical/high vulnerabilities and {complexityErrors || 0} overly complex functions.
          </p>

          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${overallScore}%`,
                background: `linear-gradient(90deg, ${color}88, ${color})`,
                borderRadius: 4,
                transition: 'width 1.5s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: `0 0 12px ${color}66`,
              }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* Vulnerabilities Card */}
        <div className="glass fade-up fade-up-2" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Security Dependencies</h3>
            </div>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: totalVulns > 0 ? 'var(--fail)' : 'var(--pass)' }}>
              {totalVulns || 0}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            High & Critical vulnerabilities found via npm audit.
          </p>
          {auditError && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.8rem', color: '#f59e0b', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
              ⚠ {auditError}
            </div>
          )}
          {totalVulns > 0 ? (
            <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
              {getVulnList().map((vuln, idx) => (
                <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: '#a5b4fc', wordBreak: 'break-all' }}>
                      {vuln.name || vuln.module_name}
                    </span>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '2px 8px', 
                      borderRadius: 100, 
                      background: vuln.severity === 'critical' ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)',
                      color: vuln.severity === 'critical' ? 'var(--fail)' : '#f59e0b',
                      textTransform: 'uppercase',
                      fontWeight: 700
                    }}>
                      {vuln.severity}
                    </span>
                  </div>
                  {vuln.via && Array.isArray(vuln.via) && vuln.via.filter(v => typeof v === 'object' && v.title).slice(0,1).map((viaItem, i) => (
                     <div key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                       {viaItem.title}
                     </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: 8, fontSize: '0.85rem', color: 'var(--pass)', fontFamily: 'var(--font-mono)' }}>
               No critical or high vulnerabilities found!
            </div>
          )}
        </div>

        {/* Complexity Card */}
        <div className="glass fade-up fade-up-3" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Cyclomatic Complexity</h3>
            </div>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: (complexityErrors || 0) > 0 ? 'var(--fail)' : 'var(--pass)' }}>
              {complexityErrors || 0}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Functions exceeding complexity threshold (branching depth &gt; 10).
          </p>
          {eslintError && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.8rem', color: '#f59e0b', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
              ⚠ {eslintError}
            </div>
          )}
          {(eslintData && eslintData.length > 0) ? (
            <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
              {eslintData.map((func, idx) => (
                <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: idx === eslintData.length - 1 ? 'none' : '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: '#a5b4fc', marginBottom: 8, wordBreak: 'break-all' }}>
                    {func.filePath} (Line {func.line})
                  </div>
                  <div style={{ display: 'flex', gap: 8, color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--fail)' }}>✗</span>
                    <span>Function <strong style={{color: 'var(--text)'}}>{func.functionName}</strong> has complexity of <strong style={{color: 'var(--fail)'}}>{func.complexity}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: 8, fontSize: '0.85rem', color: 'var(--pass)', fontFamily: 'var(--font-mono)' }}>
               No overly complex files found!
            </div>
          )}

          {parsedFiles && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Files Parsed ({parsedFiles.length})</h4>
                  {skippedFiles && skippedFiles.length > 0 && (
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Files Skipped ({skippedFiles.length})</h4>
                  )}
               </div>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', maxHeight: 100, overflowY: 'auto', background: 'var(--bg)', padding: '0.75rem', borderRadius: 6 }}>
                  {parsedFiles.join(', ')}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions && (
        <div className="glass fade-up" style={{ padding: '2rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>AI Suggestions</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>powered by Gemini</span>
          </div>
          <div style={{
            background: 'var(--bg)',
            padding: '1.25rem',
            borderRadius: 8,
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-sans)',
          }}>
            {aiSuggestions}
          </div>
        </div>
      )}
    </div>
  )
}
