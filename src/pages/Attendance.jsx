import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { getClasses, toast } from '../lib/utils.js'

export default function Attendance() {
  const [classes, setClasses] = useState([])
  const [people, setPeople] = useState([])
  const [existing, setExisting] = useState({})
  const [classId, setClassId] = useState('')
  const [type, setType] = useState('student')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getClasses().then(setClasses)
    loadHistory()
  }, [])

  useEffect(() => {
    if (classId) loadRoll()
  }, [classId, type, date])

  async function loadRoll() {
    const table = type === 'teacher' ? 'teachers' : 'students'
    const { data } = await supabase.from(table).select('*').eq('class_id', classId).eq('status', 'active').order('full_name')
    setPeople(data || [])

    const idColumn = type === 'teacher' ? 'teacher_id' : 'student_id'
    const { data: att } = await supabase
      .from('attendance')
      .select(`${idColumn}, status`)
      .eq('date', date)
      .in(idColumn, data?.length ? data.map((p) => p.id) : ['00000000-0000-0000-0000-000000000000'])

    const map = {}
    ;(att || []).forEach((a) => (map[a[idColumn]] = a.status))
    setExisting(map)
  }

  function setStatus(pid, status) {
    setExisting((prev) => ({ ...prev, [pid]: status }))
  }

  function setAll(status) {
    const map = {}
    people.forEach((p) => { if (existing[p.id]) map[p.id] = status })
    setExisting((prev) => ({ ...prev, ...map }))
  }

  async function saveAttendance() {
    if (!classId || people.length === 0) return toast('Select a class first', 'error')
    setSaving(true)

    const idColumn = type === 'teacher' ? 'teacher_id' : 'student_id'
    const currentTime = new Date().toTimeString().slice(0, 5)
    const { data: session } = await supabase.auth.getSession()
    const markedBy = session?.session?.user?.id || null

    const rows = people
      .filter((p) => existing[p.id])
      .map((p) => ({
        [idColumn]: p.id,
        class_id: classId,
        date,
        time_in: currentTime,
        status: existing[p.id],
        marked_by: markedBy,
      }))

    if (rows.length === 0) {
      setSaving(false)
      return toast('Mark at least one status', 'error')
    }

    const personIds = people.filter((p) => existing[p.id]).map((p) => p.id)
    if (personIds.length > 0) {
      await supabase.from('attendance').delete().eq('date', date).eq('marked_by', markedBy).in(idColumn, personIds)
    }

    const { error } = await supabase.from('attendance').insert(rows)
    setSaving(false)

    if (error) return toast(error.message, 'error')
    toast(`Attendance saved for ${rows.length} ${type}(s)`)
    loadHistory()
  }

  async function loadHistory() {
    const { data } = await supabase
      .from('attendance')
      .select('id, status, time_in, date, teacher_id, student_id, teacher:teacher_id(full_name), student:student_id(full_name), class:class_id(name, section)')
      .order('created_at', { ascending: false })
      .limit(15)
    setHistory(data || [])
  }

  return (
    <>
      <div className="panel" style={{ marginBottom: 18 }}>
        <h3>Take Roll Call</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Select a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.section ? ' - ' + c.section : ''}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Person Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Quick Actions</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setAll('present')}>All Present</button>
              <button className="btn btn-outline btn-sm" onClick={() => setAll('absent')}>All Absent</button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Code</th><th style={{ width: 320 }}>Status</th></tr></thead>
            <tbody>
              {!classId ? (
                <tr><td colSpan="3" className="empty-state">Select a class to begin.</td></tr>
              ) : people.length === 0 ? (
                <tr><td colSpan="3" className="empty-state">No {type}s in this class.</td></tr>
              ) : (
                people.map((p) => (
                  <tr key={p.id}>
                    <td><div className="person">
                      <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.full_name)}`} alt="" />
                      {p.full_name}
                    </div></td>
                    <td>{p.teacher_code || p.student_code || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} className="status-group">
                        {['present', 'absent', 'late', 'leave'].map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`btn btn-sm status-btn ${existing[p.id] === s ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setStatus(p.id, s)}
                          >
                            {s[0].toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                        {existing[p.id] && (
                          <span className={`badge ${existing[p.id]}`} style={{ marginLeft: 8, fontSize: 11 }}>
                            Saved: {existing[p.id][0].toUpperCase() + existing[p.id].slice(1)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 18, textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={saveAttendance} disabled={saving}>
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3>Attendance History</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Class</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">No attendance history yet.</td></tr>
              ) : (
                history.map((r) => {
                  const isTeacher = r.teacher_id !== null
                  const person = isTeacher ? r.teacher : r.student
                  const className = r.class ? `${r.class.name}${r.class.section ? ' - ' + r.class.section : ''}` : '-'
                  return (
                    <tr key={r.id}>
                      <td>{person?.full_name || 'Unknown'}</td>
                      <td>{isTeacher ? 'Teacher' : 'Student'}</td>
                      <td>{className}</td>
                      <td>{r.date}</td>
                      <td>{r.time_in ? r.time_in.slice(0, 5) : '-'}</td>
                      <td><span className={`badge ${r.status}`}>{r.status[0].toUpperCase() + r.status.slice(1)}</span></td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
