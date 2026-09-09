import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const NAV_ITEMS = [
  { to: '/', icon: '🏠', label: 'Dashboard' },
  { to: '/attendance', icon: '📋', label: 'Attendance' },
  { to: '/teachers', icon: '👨‍🏫', label: 'Teachers' },
  { to: '/students', icon: '🎓', label: 'Students' },
  { to: '/classes', icon: '🏫', label: 'Classes' },
  { to: '/reports', icon: '📊', label: 'Reports' },
]

export default function Sidebar({ open, onClose }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <div className="logo">📚</div>
          <div>
            <div className="title">AttendSmart</div>
            <div className="sub">Attendance System</div>
          </div>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={onClose}
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="year">🎓 Academic Year</div>
          <div className="year-val">2025 - 2026</div>
        </div>
      </aside>
      <div className={`sidebar-overlay${open ? ' show' : ''}`} onClick={onClose} />
    </>
  )
}
