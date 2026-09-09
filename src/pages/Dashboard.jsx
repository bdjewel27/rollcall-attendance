import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { escapeHtml } from '../lib/utils.js'
import Chart from 'chart.js/auto'

export default function Dashboard() {
  const [stats, setStats] = useState({ teachers: 0, students: 0, present: 0, absent: 0 })
  const [deltas, setDeltas] = useState({})
  const [recent, setRecent] = useState([])
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, leave: 0 })
  const [chartEmpty, setChartEmpty] = useState(false)
  const weekCanvas = useRef(null)
  const donutCanvas = useRef(null)
  const weekChart = useRef(null)
  const donutChart = useRef(null)

  useEffect(() => {
    loadAll()
    return () => {
      if (weekChart.current) weekChart.current.destroy()
      if (donutChart.current) donutChart.current.destroy()
    }
  }, [])

  async function loadAll() {
    await Promise.all([loadStats(), loadRecent(), loadWeekChart(), loadDonut()])
  }

  async function loadStats() {
    const today = new Date().toISOString().slice(0, 10)
    const [{ count: teacherCount }, { count: studentCount }, { data: todayRows }] = await Promise.all([
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('attendance').select('status').eq('date', today),
    ])

    const present = (todayRows || []).filter((r) => r.status === 'present').length
    const late = (todayRows || []).filter((r) => r.status === 'late').length
    const absent = (todayRows || []).filter((r) => r.status === 'absent').length
    const leave = (todayRows || []).filter((r) => r.status === 'leave').length

    setStats({
      teachers: teacherCount ?? 0,
      students: studentCount ?? 0,
      present: present + late,
      absent: absent + leave,
    })
    setDeltas({
      present: `Present: ${present} | Late: ${late}`,
      absent: `Absent: ${absent} | Leave: ${leave}`,
      teachers: 'Active',
      students: 'Active',
    })
  }

  async function loadRecent() {
    const { data } = await supabase
      .from('attendance')
      .select('id, status, time_in, date, teacher_id, student_id, teacher:teacher_id(full_name, teacher_code, class_id), student:student_id(full_name, student_code, class_id), class:class_id(name, section)')
      .order('created_at', { ascending: false })
      .limit(6)
    setRecent(data || [])
  }

  async function loadWeekChart() {
    const days = [...Array(7)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().slice(0, 10)
    })
    const { data } = await supabase.from('attendance').select('date, status').in('date', days)

    if (!data || data.length === 0) {
      setChartEmpty(true)
      return
    }
    setChartEmpty(false)

    const present = days.map((d) => data.filter((r) => r.date === d && r.status === 'present').length)
    const absent = days.map((d) => data.filter((r) => r.date === d && r.status === 'absent').length)
    const late = days.map((d) => data.filter((r) => r.date === d && r.status === 'late').length)
    const leave = days.map((d) => data.filter((r) => r.date === d && r.status === 'leave').length)

    if (weekChart.current) weekChart.current.destroy()
    weekChart.current = new Chart(weekCanvas.current, {
      type: 'line',
      data: {
        labels: days.map((d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })),
        datasets: [
          { label: 'Present', data: present, borderColor: '#16a34a', backgroundColor: '#16a34a', tension: 0.35 },
          { label: 'Absent', data: absent, borderColor: '#ef4444', backgroundColor: '#ef4444', tension: 0.35 },
          { label: 'Late', data: late, borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0.35 },
          { label: 'Leave', data: leave, borderColor: '#8b5cf6', backgroundColor: '#8b5cf6', tension: 0.35 },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    })
  }

  async function loadDonut() {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('attendance').select('status').eq('date', today)

    const present = (data || []).filter((r) => r.status === 'present').length
    const absent = (data || []).filter((r) => r.status === 'absent').length
    const late = (data || []).filter((r) => r.status === 'late').length
    const leave = (data || []).filter((r) => r.status === 'leave').length
    const total = present + absent + late + leave || 1

    setSummary({
      present: `${present} (${Math.round((present / total) * 100)}%)`,
      absent: `${absent} (${Math.round((absent / total) * 100)}%)`,
      late: `${late} (${Math.round((late / total) * 100)}%)`,
      leave: `${leave} (${Math.round((leave / total) * 100)}%)`,
    })

    if (donutChart.current) donutChart.current.destroy()
    donutChart.current = new Chart(donutCanvas.current, {
      type: 'doughnut',
      data: {
        labels: ['Present', 'Absent', 'Late', 'Leave'],
        datasets: [{ data: [present, absent, late, leave], backgroundColor: ['#16a34a', '#ef4444', '#f59e0b', '#8b5cf6'], borderWidth: 0 }],
      },
      options: { cutout: '72%', plugins: { legend: { display: false } } },
    })
  }

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="top">
            <div className="stat-icon" style={{ background: 'var(--blue)' }}>👨‍🏫</div>
            <div><div className="label">Active Teachers</div><div className="value">{stats.teachers}</div></div>
          </div>
          <div className="delta up">{deltas.teachers}</div>
        </div>
        <div className="stat-card">
          <div className="top">
            <div className="stat-icon" style={{ background: 'var(--green)' }}>🎓</div>
            <div><div className="label">Active Students</div><div className="value">{stats.students}</div></div>
          </div>
          <div className="delta up">{deltas.students}</div>
        </div>
        <div className="stat-card">
          <div className="top">
            <div className="stat-icon" style={{ background: 'var(--purple)' }}>✅</div>
            <div><div className="label">Today Present + Late</div><div className="value">{stats.present}</div></div>
          </div>
          <div className="delta up">{deltas.present}</div>
        </div>
        <div className="stat-card">
          <div className="top">
            <div className="stat-icon" style={{ background: 'var(--red)' }}>❌</div>
            <div><div className="label">Today Absent</div><div className="value">{stats.absent}</div></div>
          </div>
          <div className="delta down">{deltas.absent}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Attendance Overview <span>(Last 7 days)</span></h3>
          {chartEmpty && <div className="empty-state">No attendance data yet.</div>}
          <canvas ref={weekCanvas} height="110" style={{ display: chartEmpty ? 'none' : 'block' }} />
        </div>
        <div className="panel">
          <h3>Today's Summary <span>({new Date().toISOString().slice(0, 10)})</span></h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <canvas ref={donutCanvas} width="120" height="120" style={{ maxWidth: 120, maxHeight: 120 }} />
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} /> Present <strong style={{ marginLeft: 'auto' }}>{summary.present}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} /> Absent <strong>{summary.absent}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--orange)', display: 'inline-block' }} /> Late <strong>{summary.late}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--purple)', display: 'inline-block' }} /> Leave <strong>{summary.leave}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3>Recent Attendance</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>ID</th><th>Role</th><th>Class</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">No attendance records yet.</td></tr>
              ) : (
                recent.map((r) => {
                  const isTeacher = r.teacher_id !== null
                  const person = isTeacher ? r.teacher : r.student
                  const code = isTeacher ? person?.teacher_code : person?.student_code
                  const className = r.class ? `${r.class.name}${r.class.section ? ' - ' + r.class.section : ''}` : '-'
                  return (
                    <tr key={r.id}>
                      <td><div className="person">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(person?.full_name || '?')}`} alt="" />
                        {escapeHtml(person?.full_name || 'Unknown')}
                      </div></td>
                      <td>{escapeHtml(code || '-')}</td>
                      <td>{isTeacher ? 'Teacher' : 'Student'}</td>
                      <td>{escapeHtml(className)}</td>
                      <td>{r.time_in ? r.time_in.slice(0, 5) : '-'}</td>
                      <td><span className={`badge ${r.status}`}>{r.status[0].toUpperCase() + r.status.slice(1)}</span></td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <Link to="/attendance" className="view-all">View All Attendance →</Link>
      </div>
    </>
  )
}
