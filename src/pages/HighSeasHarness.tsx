import HighSeasPage from './HighSeasPage'

/**
 * Dev-only harness for the High Seas game. The page already works without auth
 * (the user-data context keeps an in-memory save when logged out), so this just
 * mounts it directly at a non-gated route for MCP/visual testing.
 */
export default function HighSeasHarness() {
  return <HighSeasPage />
}
