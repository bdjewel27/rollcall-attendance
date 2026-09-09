import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { sanitizeSearch } from '../lib/utils.js'

export default function Topbar({ onMenuToggle }) {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  async function handleSearch(e) {
    if (e.key !== 'Enter') return
    const q = query.trim()
    if (!q) return
    const safe = sanitizeSearch(q)
    const [{ data: students }, { data: teachers }] = await Promise.all([
      supabase.from('students').select('*, class:classes(name, section)')
        .or(`full_name.ilike.%${safe}%,student_code.ilike.%${safe}%`).limit(5),
      supabase.from('teachers').select('*, class:classes(name, section)')
        .or(`full_name.ilike.%${safe}%,teacher_code.ilike.%${safe}%`).limit(5),
    ])
    navigate('/search', { state: { students: students || [], teachers: teachers || [], query: q } })
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const initials = (profile?.full_name || user?.email || '?').slice(0, 2).toUpperCase()

  return (
    <header className="topbar">
      <div className="left">
        <button className="menu-toggle" onClick={onMenuToggle}>☰</button>
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back!</p>
        </div>
      </div>
      <div className="right">
        <div className="search-box">
          <span>🔍</span>
          <input
            id="globalSearch"
            type="text"
            placeholder="Search students/teachers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
        <div className="date-pill">📅 {today}</div>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <div className="user-chip" id="userChip">
          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${initials}`} alt="" />
          <div>
            <div className="name">{profile?.full_name || user?.email}</div>
            <div className="role">{profile?.role === 'admin' ? 'Admin' : 'Teacher'}</div>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  )
}
