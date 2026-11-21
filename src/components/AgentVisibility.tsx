import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { shouldHideAgent } from '../lib/agentVisibility'

export function AgentVisibility() {
  const { pathname } = useLocation()
  useEffect(() => {
    const root = document.documentElement
    if (shouldHideAgent(pathname)) root.dataset.agentHidden = 'true'
    else delete root.dataset.agentHidden
  }, [pathname])
  return null
}
