import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: import.meta.env.VITE_BLINK_PROJECT_ID || 'build-fix-tool-q1r7oc95',
  publishableKey: import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_53agUi_Sm4fhuyjswnF2LCowN3b8IgoN',
  authRequired: false,
  auth: { mode: 'managed' },
})
