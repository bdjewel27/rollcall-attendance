import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { getClasses, clearClassesCache, sanitizeSearch, toast } from '../lib/utils.js'

export default function Teachers() {
  const { isAdmin } = useAuth()
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 25

  const [form, setForm] = useState({
    teacher_code: '', full_name: '', email: '', phone: '', class_id: '', status: 'active'
  })

  useEffect(() => {
    getClasses().then(setClasses)
    loadTeachers()
  }, [])

  useEffect(() => {
    loadTeachers()
  }, [search, classFilter, statusFilter, page])

  async function loadTeachers() {
    let query = supabase.from('teachers').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (search) {
      const safe = sanitizeSearch(search)
      query = query.or(`full_name.ilike.%${safe}%,teacher_code.ilike.%${safe}%`)
    }
    if (classFilter) query = query.eq('class_id', classFilter)
    if (statusFilter) query = query.eq('status', statusFilter)
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    const { data, count, error } = await query
    setTotal(count || 0)
    if (error) return toast(error.message, 'error')
    setTeachers(data || [])
  }

  function openModal(t = null) {
    setEditingId(t?.id || null)
    setForm(t ? {
      teacher_code: t.teacher_code,
      full_name: t.full_name,
      email: t.email || '',
      phone: t.phone || '',
      class_id: t.class_id || '',
      status: t.status,
    } : { teacher_code: '', full_name: '', email: '', phone: '', class_id: '', status: 'active' })
    setModalOpen(true)
  }

  async function saveTeacher(e) {
    e.preventDefault()
    const payload = {
      teacher_code: form.teacher_code.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      class_id: form.class_id || null,
      status: form.status,
    }
    const { error } = editingId
      ? await supabase.from('teachers').update(payload).eq('id', editingId)
      : await supabase.from('teachers').insert([payload])
    if (error) return toast(error.message, 'error')
    toast(editingId ? 'Teacher updated' : 'Teacher added')
    setModalOpen(false)
    loadTeachers()
  }

  async function deleteTeacher(id) {
    if (!confirm('Delete this teacher?')) return
    const { error } = await supabase.from('teachers').delete().eq('id', id)
    if (error) return toast(error.message, 'error')
    toast('Teacher deleted')
    loadTeachers()
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
        {isAdmin && <button className="btn btn-primary" onClick={() => openModal()}>+ Add Teacher</button>}
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Teacher</th><th>Code</th><th>Email</th><th>Phone</th><th>Class</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr><td colSpan="7" className="empty-state">No teachers found.</td></tr>
              ) : (
                teachers.map((t) => {
                  const cls = classes.find((c) => c.id === t.class_id)
                  return (
                    <tr key={t.id}>
                      <td><div className="person">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.full_name)}`} alt="" />
                        {t.full_name}
                      </div></td>
                      <td>{t.teacher_code}</td>
                      <td>{t.email || '-'}</td>
                      <td>{t.phone || '-'}</td>
                      <td>{cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : '-'}</td>
                      <td><span className={`badge ${t.status === 'active' ? 'present' : 'absent'}`}>{t.status}</span></td>
                      <td>
                        {isAdmin ? (
                          <>
                            <button className="btn btn-outline btn-sm" onClick={() => openModal(t)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteTeacher(t.id)}>Delete</button>
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
              <h3>{editingId ? 'Edit Teacher' : 'Add Teacher'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={saveTeacher}>
              <div className="form-row">
                <div className="form-group">
                  <label>Teacher Code</label>
                  <input value={form.teacher_code} onChange={(e) => setForm({ ...form, teacher_code: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
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
              <div className="form-row">
                <div className="form-group">
                  <label>Class</label>
                  <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
                    <option value="">None</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ' - ' + c.section : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Teacher</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
