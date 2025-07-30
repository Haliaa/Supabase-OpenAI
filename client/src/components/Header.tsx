import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function Header() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    location.href = '/login'
  }

  return (
    <header className="flex justify-between items-center p-4 bg-gray-100 shadow">
      <div className="text-xl font-semibold">AI Chat App</div>
      <nav className="space-x-4">
        <Link href="/chat" className="text-blue-600 hover:underline">Chat</Link>
        <Link href="/login" className="text-blue-600 hover:underline">Login</Link>
        {user && (
          <button onClick={handleLogout} className="ml-4 text-red-600 hover:underline">
            Logout
          </button>
        )}
      </nav>
    </header>
  )
}
