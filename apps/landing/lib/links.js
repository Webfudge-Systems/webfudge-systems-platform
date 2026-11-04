import { getAppUrl } from '@webfudge/utils'

/** Webfudge Accounts handles every sign-up and sign-in; the website only links there. */
export const ACCOUNTS_URL = getAppUrl('accounts')
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://webfudgesystems.in').replace(/\/$/, '')

export const signupUrl = () => `${ACCOUNTS_URL}/signup`
export const loginUrl = () => `${ACCOUNTS_URL}/login`
