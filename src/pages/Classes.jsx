import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { clearClassesCache, toast } from '../lib/utils.js'

export default function Classes() {
  const { isAdmin } = useAuth()
  const [classes, setClasses] = useState([])
  const [studentCounts, setStudentCounts] = useState({})
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const [form, setForm] = useState({ name: '', section: '', academic_year: '2025-2026' })

  useEffect(() => {
    loadClasses()
  }, [search])

  async function loadClasses() {
    let query = supabase.from('classes').select('*').order('name')
    if (search) query = query.ilike('name', `%${search}%`)
    const { data, error } = await query
    if (error) return toast(error.message, 'error')
    setClasses(data || [])

    // Count students per class
    const { data: allStudents } = await supabase.from('students').select('class_id')
    const counts = {}
    ;(allStudents || []).forEach((s) => { counts[s.class_id] = (counts[s.class_id] || 0) + 1 })
    setStudentCounts(counts)
  }

  function openModal(c = null) {
    setEditingId(c?.id || null)
    setForm(c ? { name: c.name, section: c.section || '', academic_year: c.academic_year || '2025-2026' } : { name: '', section: '', academic_year: '2025-2026' })
    setModalOpen(true)
  }

  async function saveClass(e) {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      section: form.section.trim() || null,
      academic_year: form.academic_year.trim() || '2025-2026',
    }
    const { error } = editingId
      ? await supabase.from('classes').update(payload).eq('id', editingId)
      : await supabase.from('classes').insert([payload])
    if (error) return toast(error.message, 'error')
    toast(editingId ? 'Class updated' : 'Class added')
    setModalOpen(false)
    clearClassesCache()
    loadClasses()
  }

  async function deleteClass(id) {
    if (!confirm('Delete this class?')) return
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) return toast(error.message, 'error')
    toast('Class deleted')
    clearClassesCache()
    loadClasses()
  }

  return (
    <>
      <div className="toolbar">
        <div className="filters">
          <input type="text" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => openModal()}>+ Add Class</button>}
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Class</th><th>Section</th><th>Year</th><th>Students</th><th>Actions</th></tr></thead>
            <tbody>
              {classes.length === 0 ? (
                <tr><td colSpan="5" className="empty-state">No classes found.</td></tr>
              ) : (
                classes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.section || '-'}</td>
                    <td>{c.academic_year}</td>
                    <td>{studentCounts[c.id] || 0}</td>
                    <td>
                      {isAdmin ? (
                        <>
                          <button className="btn btn-outline btn-sm" onClick={() => openModal(c)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteClass(c.id)}>Delete</button>
                        </>
                      ) : <span style={{ color: '#999' }}>View only</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-head">
              <h3>{editingId ? 'Edit Class' : 'Add Class'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={saveClass}>
              <div className="form-group">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Section</label>
                <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Academic Year</label>
                <input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Class</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
