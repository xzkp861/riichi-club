import { redirect } from 'next/navigation'

// Temporarily hide this public route; retain the engine and rule history in the repository.
export default function DanRulesPage() {
  redirect('/')
}
