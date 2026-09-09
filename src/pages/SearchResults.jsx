import { useLocation } from 'react-router-dom'
import { escapeHtml } from '../lib/utils.js'

export default function SearchResults() {
  const location = useLocation()
  const { students = [], teachers = [], query = '' } = location.state || {}

  function getClassName(item) {
    if (!item.class) return '-'
    if (typeof item.class === 'object') {
      return `${item.class.name}${item.class.section ? ' - ' + item.class.section : ''}`
    }
    return '-'
  }

  return (
    <>
      <div className="panel">
        <h3>Students ({students.length})</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Code</th><th>Class</th><th>Status</th></tr></thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="4" className="empty-state">No students found</td></tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    <td><div className="person">
                      <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.full_name)}`} alt="" />
                      {escapeHtml(s.full_name)}
                    </div></td>
                    <td>{escapeHtml(s.student_code)}</td>
                    <td>{getClassName(s)}</td>
                    <td><span className={`badge ${s.status === 'active' ? 'present' : 'absent'}`}>{s.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Teachers ({teachers.length})</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Code</th><th>Class</th><th>Status</th></tr></thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr><td colSpan="4" className="empty-state">No teachers found</td></tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.id}>
                    <td><div className="person">
                      <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.full_name)}`} alt="" />
                      {escapeHtml(t.full_name)}
                    </div></td>
                    <td>{escapeHtml(t.teacher_code)}</td>
                    <td>{getClassName(t)}</td>
                    <td><span className={`badge ${t.status === 'active' ? 'present' : 'absent'}`}>{t.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
