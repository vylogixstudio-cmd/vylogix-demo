import { redirect } from 'next/navigation'

/**
 * Root page — the middleware will intercept authenticated users and redirect them
 * to their respective dashboards before this component renders. Unauthenticated
 * visitors are redirected to /login.
 */
export default function RootPage() {
  redirect('/login')
}
