// The Anam voice/video agent is declared once in index.html. It is hidden on
// sign-in and billing screens so it does not distract during those flows.
const HIDDEN_AGENT_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback', '/billing/complete']

export function shouldHideAgent(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return HIDDEN_AGENT_PATHS.includes(path)
}

// Hides the agent while the checkout consent dialog is open. Counted so that
// overlapping dialogs do not show the agent again too early.
let checkoutHolds = 0
export function holdAgentHiddenForCheckout(): () => void {
  checkoutHolds += 1
  document.documentElement.dataset.agentCheckout = 'true'
  let released = false
  return () => {
    if (released) return
    released = true
    checkoutHolds -= 1
    if (checkoutHolds === 0) delete document.documentElement.dataset.agentCheckout
  }
}
