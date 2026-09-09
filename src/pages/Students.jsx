import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { getClasses, sanitizeSearch, toast } from '../lib/utils.js'

export default function Students() {
  const { isAdmin } = useAuth()
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 25

  const [form, setForm] = useState({
    student_code: '', full_name: '', email: '', phone: '', class_id: '', roll_no: '', status: 'active'
  })

  useEffect(() => {
    getClasses().then(setClasses)
    loadStudents()
  }, [])

  useEffect(() => {
    loadStudents()
  }, [search, classFilter, statusFilter, page])

  async function loadStudents() {
    let query = supabase.from('students').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (search) {
      const safe = sanitizeSearch(search)
      query = query.or(`full_name.ilike.%${safe}%,student_code.ilike.%${safe}%`)
    }
    if (classFilter) query = query.eq('class_id', classFilter)
    if (statusFilter) query = query.eq('status', statusFilter)
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    const { data, count, error } = await query
    setTotal(count || 0)
    if (error) return toast(error.message, 'error')
    setStudents(data || [])
  }

  function openModal(s = null) {
    setEditingId(s?.id || null)
    setForm(s ? {
      student_code: s.student_code,
      full_name: s.full_name,
      email: s.email || '',
      phone: s.phone || '',
      class_id: s.class_id || '',
      roll_no: s.roll_no || '',
      status: s.status,
    } : { student_code: '', full_name: '', email: '', phone: '', class_id: '', roll_no: '', status: 'active' })
    setModalOpen(true)
  }

  async function saveStudent(e) {
    e.preventDefault()
    const payload = {
      student_code: form.student_code.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      class_id: form.class_id || null,
      roll_no: form.roll_no.trim() || null,
      status: form.status,
    }
    const { error } = editingId
      ? await supabase.from('students').update(payload).eq('id', editingId)
      : await supabase.from('students').insert([payload])
    if (error) return toast(error.message, 'error')
    toast(editingId ? 'Student updated' : 'Student added')
    setModalOpen(false)
    loadStudents()
  }

  async function deleteStudent(id) {
    if (!confirm('Delete this student?')) return
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) return toast(error.message, 'error')
    toast('Student deleted')
    loadStudents()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      <div className="toolbar">
        <div className="filters">
          <input type="text" placeholder="Search by name or code..." value={search} onChange={(e) => { setPage(0); setSearch(e.target.value) }} />
          <select value={classFilter} onChange={(e) => { setPage(0); setClassFilter(e.target.value) }}>
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ' - ' + c.section : ''}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setPage(0); setStatusFilter(e.target.value) }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => openModal()}>+ Add Student</button>}
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Code</th><th>Roll No</th><th>Class</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="7" className="empty-state">No students found.</td></tr>
              ) : (
                students.map((s) => {
                  const cls = classes.find((c) => c.id === s.class_id)
                  return (
                    <tr key={s.id}>
                      <td><div className="person">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.full_name)}`} alt="" />
                        {s.full_name}
                      </div></td>
                      <td>{s.student_code}</td>
                      <td>{s.roll_no || '-'}</td>
                      <td>{cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : '-'}</td>
                      <td>{s.phone || '-'}</td>
                      <td><span className={`badge ${s.status === 'active' ? 'present' : 'absent'}`}>{s.status}</span></td>
                      <td>
                        {isAdmin ? (
                          <>
                            <button className="btn btn-outline btn-sm" onClick={() => openModal(s)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteStudent(s.id)}>Delete</button>
                          </>
                        ) : <span style={{ color: '#999' }}>View only</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination" style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            <button className={`btn btn-sm ${page === 0 ? 'btn-outline' : 'btn-primary'}`} disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
            <span style={{ alignSelf: 'center', color: 'var(--text-light)' }}>Page {page + 1} of {totalPages}</span>
            <button className={`btn btn-sm ${page >= totalPages - 1 ? 'btn-outline' : 'btn-primary'}`} disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-head">
              <h3>{editingId ? 'Edit Student' : 'Add Student'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={saveStudent}>
              <div className="form-row">
                <div className="form-group">
                  <label>Student Code</label>
                  <input value={form.student_code} onChange={(e) => setForm({ ...form, student_code: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Roll No</label>
                  <input value={form.roll_no} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Class</label>
                  <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
                    <option value="">None</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ' - ' + c.section : ''}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} pattern="01[3-9][0-9]{8}" title="Bangladesh phone number (11 digits)" />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Student</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
