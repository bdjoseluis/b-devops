import { useState, useEffect, useCallback } from 'react'

const SK = 'bdev_workspace_v2'

function loadCases() {
  try { return JSON.parse(localStorage.getItem(SK)) || [] }
  catch { return [] }
}
function saveCases(cases) {
  try { localStorage.setItem(SK, JSON.stringify(cases)) } catch {}
}

/**
 * Shared hook for workspace case management.
 * Reads/writes to the same localStorage key as the Workspace page.
 */
export function useWorkspace() {
  const [cases, setCases] = useState(loadCases)

  useEffect(() => { saveCases(cases) }, [cases])

  // Re-sync when localStorage changes from another tab/component
  useEffect(() => {
    const handler = () => setCases(loadCases())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const addFindingToCase = useCallback((caseId, finding) => {
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c
      const findings = [...(c.findings || []), finding]
      const timeline = [...(c.timeline || []), { ts: Date.now(), text: `Finding importado: ${finding.title}` }]
      return { ...c, findings, timeline, updatedAt: Date.now() }
    }))
  }, [])

  const createCaseWithFindings = useCallback((name, target, type, findings) => {
    const now = Date.now()
    const newCase = {
      id: `case-${now}`,
      name,
      target,
      type: type || 'domain',
      desc: `Creado desde Intelligence Pivot`,
      tags: ['pivot', 'auto'],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      notes: '',
      findings,
      timeline: [
        { ts: now, text: 'Investigación creada desde Intelligence Pivot' },
        ...findings.map(f => ({ ts: now, text: `Finding importado: ${f.title}` }))
      ],
    }
    setCases(prev => [newCase, ...prev])
    return newCase.id
  }, [])

  return { cases, addFindingToCase, createCaseWithFindings }
}
