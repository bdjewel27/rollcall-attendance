import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { getClasses, toast } from '../lib/utils.js'
import Chart from 'chart.js/auto'

export default function Reports() {
  const [classes, setClasses] = useState([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [classId, setClassId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [reportData, setReportData] = useState([])
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, leave: 0 })
  const chartRef = useRef(null)
  const chartInst = useRef(null)

  useEffect(() => {
    getClasses().then(setClasses)
  }, [])

  async function runReport() {
    if (!from || !to) return toast('Select date range', 'error')

    let query = supabase
      .from('attendance')
      .select('*, teacher_id, student_id, teacher:teacher_id(full_name), student:student_id(full_name)')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .limit(200)

    if (classId) query = query.eq('class_id', classId)
    if (statusFilter) query = query.eq('status', statusFilter)

    const { data, error } = await query
    if (error) return toast(error.message, 'error')
    if (data?.length === 200) toast('Report limited to 200 records. Narrow date range for full results.', 'info')

    const rows = (data || []).map((r) => {
      const isTeacher = r.teacher_id !== null
      const personName = isTeacher ? r.teacher?.full_name : r.student?.full_name
      const cls = classes.find((c) => c.id === r.class_id)
      return {
        ...r,
        personName: personName || 'Unknown',
        role: isTeacher ? 'Teacher' : 'Student',
        className: cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : '-',
      }
    })

    setReportData(rows)

    const present = rows.filter((r) => r.status === 'present').length
    const absent = rows.filter((r) => r.status === 'absent').length
    const late = rows.filter((r) => r.status === 'late').length
    const leave = rows.filter((r) => r.status === 'leave').length
    setSummary({ present, absent, late, leave })

    if (chartInst.current) chartInst.current.destroy()
    chartInst.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: ['Present', 'Absent', 'Late', 'Leave'],
        datasets: [{ data: [present, absent, late, leave], backgroundColor: ['#16a34a', '#ef4444', '#f59e0b', '#8b5cf6'] }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    })
  }

  function exportCSV() {
    if (reportData.length === 0) return toast('No data to export', 'error')
    const headers = ['Date', 'Name', 'Role', 'Class', 'Status', 'Time']
    const rows = reportData.map((r) => [r.date, r.personName, r.role, r.className, r.status, r.time_in || '-'])
    const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-report-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="panel" style={{ marginBottom: 18 }}>
        <h3>Report Filters</h3>
        <div className="form-row">
          <div className="form-group">
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ' - ' + c.section : ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="leave">Leave</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={runReport}>Run Report</button>
          <button className="btn btn-outline" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      {reportData.length > 0 && (
        <>
          <div className="grid-2">
            <div className="panel">
              <h3>Summary</h3>
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                <div className="stat-card"><div className="top"><div className="stat-icon" style={{ background: 'var(--green)' }}>✅</div><div><div className="label">Present</div><div className="value">{summary.present}</div></div></div></div>
                <div className="stat-card"><div className="top"><div className="stat-icon" style={{ background: 'var(--red)' }}>❌</div><div><div className="label">Absent</div><div className="value">{summary.absent}</div></div></div></div>
                <div className="stat-card"><div className="top"><div className="stat-icon" style={{ background: 'var(--orange)' }}>⏰</div><div><div className="label">Late</div><div className="value">{summary.late}</div></div></div></div>
                <div className="stat-card"><div className="top"><div className="stat-icon" style={{ background: 'var(--purple)' }}>🏖️</div><div><div className="label">Leave</div><div className="value">{summary.leave}</div></div></div></div>
              </div>
            </div>
            <div className="panel">
              <h3>Status Breakdown</h3>
              <canvas ref={chartRef} height="120" />
            </div>
          </div>

          <div className="panel" style={{ marginTop: 18 }}>
            <h3>Detailed Report ({reportData.length} records)</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Name</th><th>Role</th><th>Class</th><th>Status</th><th>Time</th></tr></thead>
                <tbody>
                  {reportData.map((r) => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td>{r.personName}</td>
                      <td>{r.role}</td>
                      <td>{r.className}</td>
                      <td><span className={`badge ${r.status}`}>{r.status[0].toUpperCase() + r.status.slice(1)}</span></td>
                      <td>{r.time_in || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
