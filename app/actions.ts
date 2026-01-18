'use server'

import { cookies } from 'next/headers'

export async function dismissVideoHelp() {
  const cookieStore = await cookies()
  // Set cookie to expire in 10 years (effectively forever)
  // 10 years * 365 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
  const tenYears = 10 * 365 * 24 * 60 * 60 * 1000
  cookieStore.set('videoHelpDismissed', 'true', { expires: Date.now() + tenYears })
}
