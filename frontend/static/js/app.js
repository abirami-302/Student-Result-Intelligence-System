// ═══════════════════════════════════════════════════════════
//  SRIS — Student Result Intelligence System · Frontend App
// ═══════════════════════════════════════════════════════════

const API = '';
let charts = {};
let currentPage = 'dashboard';

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
    if (!res.ok) { window.location.href = '/login'; return; }
    const user = await res.json();
    document.getElementById('userName').textContent = user.username;
    document.getElementById('userRole').textContent = user.role;
    document.getElementById('userAvatar').textContent = user.username[0].toUpperCase();
  } catch { window.location.href = '/login'; return; }

  // Nav routing
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = el.dataset.page;
      navigateTo(page);
    });
  });

  // Route from URL path
  const path = window.location.pathname.replace('/', '') || 'dashboard';
  const validPages = ['dashboard','students','analytics','prediction','leaderboard','settings'];
  navigateTo(validPages.includes(path) ? path : 'dashboard');
});

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  history.pushState({}, '', `/${page}`);
  renderPage(page);
}

async function renderPage(page) {
  switch(page) {
    case 'dashboard': await renderDashboard(); break;
    case 'students': await renderStudents(); break;
    case 'analytics': await renderAnalytics(); break;
    case 'prediction': await renderPrediction(); break;
    case 'leaderboard': await renderLeaderboard(); break;
    case 'settings': renderSettings(); break;
  }
}

async function apiFetch(path, opts={}) {
  const res = await fetch(`${API}${path}`, { credentials: 'include', ...opts });
  if (res.status === 401) { window.location.href = '/login'; return null; }
  return res.json();
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/login';
}

// ── Chart helper ─────────────────────────────────────────────
function destroyChart(id) { if(charts[id]) { charts[id].destroy(); delete charts[id]; } }

function chartDefaults() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#8a9bb8', font: { family: 'Space Grotesk', size: 12 } } } },
    scales: {
      x: { ticks: { color: '#8a9bb8', font: { family: 'Space Grotesk', size: 11 } }, grid: { color: '#1c2a40' } },
      y: { ticks: { color: '#8a9bb8', font: { family: 'Space Grotesk', size: 11 } }, grid: { color: '#1c2a40' } }
    }
  };
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════
async function renderDashboard() {
  const el = document.getElementById('page-dashboard');
  el.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Loading dashboard…</span></div>`;
  const [health, risk, lb] = await Promise.all([
    apiFetch('/api/analytics/class-health'),
    apiFetch('/api/analytics/risk'),
    apiFetch('/api/analytics/leaderboard')
  ]);
  if (!health) return;

  const highRisk = risk.filter(r => r.risk_level === 'HIGH').length;
  const medRisk = risk.filter(r => r.risk_level === 'MEDIUM').length;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle">Real-time academic intelligence overview</div>
      </div>
      <div class="card-badge">Live</div>
    </div>

    <div class="stats-grid">
      ${statCard('Total Students', health.total_students, '👤', 'Students enrolled')}
      ${statCard('Class Avg', health.overall_health + '%', '📈', 'Overall performance')}
      ${statCard('Pass Rate', health.pass_rate + '%', '✅', 'Students passing overall')}
      ${statCard('High Risk', highRisk, '⚠️', 'Immediate attention needed')}
      ${statCard('Top Score', health.highest_avg + '%', '🏆', 'Highest achiever')}
      ${statCard('Departments', Object.keys(health.dept_health).length, '🏛', 'Active departments')}
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Grade Distribution</div><span class="card-badge">Current Batch</span></div>
        <div class="chart-container"><canvas id="gradeChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Department Performance</div><span class="card-badge">Avg %</span></div>
        <div class="chart-container"><canvas id="deptChart"></canvas></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">⚠️ Risk Alerts</div><span class="card-badge">${highRisk + medRisk} flagged</span></div>
        <div id="riskList">${renderRiskList(risk.slice(0,5))}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">🏆 Top Performers</div><span class="card-badge">Top 5</span></div>
        ${renderMiniLeaderboard(lb.top_performers.slice(0,5))}
      </div>
    </div>
  `;

  destroyChart('gradeChart'); destroyChart('deptChart');
  const gradeDist = health.grade_distribution;
  charts['gradeChart'] = new Chart(document.getElementById('gradeChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(gradeDist),
      datasets: [{ data: Object.values(gradeDist),
        backgroundColor: ['#4f8ef7','#7c3aed','#06b6d4','#22c55e','#f59e0b','#ef4444'],
        borderWidth: 2, borderColor: '#0c1220' }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { color: '#8a9bb8', font: { family: 'Space Grotesk', size: 11 }, boxWidth: 12 } } } }
  });

  const depts = Object.keys(health.dept_health);
  charts['deptChart'] = new Chart(document.getElementById('deptChart'), {
    type: 'bar',
    data: {
      labels: depts.map(d => d.length > 12 ? d.slice(0,12)+'…' : d),
      datasets: [{ label: 'Avg %', data: Object.values(health.dept_health),
        backgroundColor: 'rgba(79,142,247,0.3)', borderColor: '#4f8ef7',
        borderWidth: 2, borderRadius: 6 }]
    },
    options: { ...chartDefaults(), plugins: { legend: { display: false } } }
  });
}

function statCard(label, value, icon, sub) {
  return `<div class="stat-card">
    <div class="stat-icon">${icon}</div>
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
    <div class="stat-change">${sub}</div>
  </div>`;
}

function renderRiskList(students) {
  if (!students.length) return `<div class="empty-state"><div class="empty-icon">✅</div>No at-risk students!</div>`;
  return students.map(s => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${s.name}</div>
        <div style="font-size:12px;color:var(--text2)">${s.roll} · ${s.dept}</div>
      </div>
      <span class="badge badge-${s.risk_level==='HIGH'?'danger':s.risk_level==='MEDIUM'?'warning':'success'}">${s.risk_level}</span>
    </div>
  `).join('');
}

function renderMiniLeaderboard(students) {
  return students.map((s,i) => `
    <div class="leaderboard-item" style="padding:10px 12px;margin-bottom:8px">
      <div class="lb-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">#${i+1}</div>
      <div><div class="lb-name" style="font-size:14px">${s.name}</div><div class="lb-dept">${s.dept}</div></div>
      <div class="lb-score" style="font-size:15px">${s.avg_percentage}%</div>
    </div>
  `).join('');
}

// ════════════════════════════════════════════════════════════
//  STUDENTS PAGE
// ════════════════════════════════════════════════════════════
let studentFilters = { search: '', dept: '', semester: '' };
let allStudents = [];

async function renderStudents(forceReload=true) {
  const el = document.getElementById('page-students');
  if (forceReload || !allStudents.length) {
    el.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Loading students…</span></div>`;
    const [students, depts, sems] = await Promise.all([
      apiFetch('/api/students'),
      apiFetch('/api/meta/departments'),
      apiFetch('/api/meta/semesters')
    ]);
    if (!students) return;
    allStudents = students;
    el.innerHTML = buildStudentsPage(students, depts, sems);
    attachStudentEvents();
  } else {
    filterStudents();
  }
}

function buildStudentsPage(students, depts, sems) {
  return `
    <div class="page-header">
      <div>
        <div class="page-title">Student Management</div>
        <div class="page-subtitle">${students.length} students enrolled</div>
      </div>
      <button class="btn btn-primary" onclick="openAddStudent()">+ Add Student</button>
    </div>
    <div class="toolbar">
      <input class="search-input" id="studentSearch" placeholder="🔍 Search by name or roll number…" oninput="filterStudents()">
      <select class="filter-select" id="deptFilter" onchange="filterStudents()">
        <option value="">All Departments</option>
        ${(depts||[]).map(d=>`<option value="${d}">${d}</option>`).join('')}
      </select>
      <select class="filter-select" id="semFilter" onchange="filterStudents()">
        <option value="">All Semesters</option>
        ${(sems||[]).map(s=>`<option value="${s}">Semester ${s}</option>`).join('')}
      </select>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table id="studentTable">
          <thead><tr>
            <th>Student</th><th>Roll No</th><th>Department</th><th>Sem</th>
            <th>Attendance</th><th>Avg %</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody id="studentTableBody">${buildStudentRows(students)}</tbody>
        </table>
      </div>
    </div>
  `;
}

function buildStudentRows(students) {
  if (!students.length) return `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">👤</div>No students found</div></td></tr>`;
  return students.map(s => {
    const pct = s.avg_percentage || 0;
    const status = pct >= 75 ? 'badge-success' : pct >= 50 ? 'badge-warning' : 'badge-danger';
    const statusTxt = pct >= 75 ? 'Good' : pct >= 50 ? 'Average' : 'At Risk';
    const attColor = s.attendance >= 75 ? 'var(--success)' : 'var(--danger)';
    return `<tr>
      <td><div style="font-weight:600">${s.name}</div></td>
      <td><span style="font-family:'DM Mono';font-size:13px;color:var(--accent)">${s.roll}</span></td>
      <td>${s.dept}</td>
      <td>Sem ${s.semester}</td>
      <td><span style="color:${attColor};font-weight:600">${s.attendance}%</span></td>
      <td><strong>${pct}%</strong></td>
      <td><span class="badge ${status}">${statusTxt}</span></td>
      <td><div class="table-actions">
        <button class="btn btn-outline btn-sm" onclick="viewStudent(${s.id})">View</button>
        <button class="btn btn-outline btn-sm" onclick="openEditStudent(${s.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.id},'${s.name}')">Del</button>
      </div></td>
    </tr>`;
  }).join('');
}

function attachStudentEvents() {
  studentFilters = { search: '', dept: '', semester: '' };
}

function filterStudents() {
  const search = document.getElementById('studentSearch')?.value.toLowerCase() || '';
  const dept = document.getElementById('deptFilter')?.value || '';
  const sem = document.getElementById('semFilter')?.value || '';
  const filtered = allStudents.filter(s =>
    (!search || s.name.toLowerCase().includes(search) || s.roll.toLowerCase().includes(search)) &&
    (!dept || s.dept === dept) &&
    (!sem || String(s.semester) === sem)
  );
  const tbody = document.getElementById('studentTableBody');
  if (tbody) tbody.innerHTML = buildStudentRows(filtered);
}

// ── Add Student Modal ─────────────────────────────────────────
const DEFAULT_SUBJECTS = ['Subject 1','Subject 2','Subject 3','Subject 4','Subject 5'];
const DEPT_SUBJECTS = {
  'Computer Science': ['Data Structures','Algorithms','DBMS','Operating Systems','Computer Networks'],
  'Electronics': ['Circuit Theory','Digital Electronics','Signals & Systems','VLSI Design','Microprocessors'],
  'Mechanical': ['Thermodynamics','Fluid Mechanics','Machine Design','Manufacturing','Heat Transfer'],
  'Civil': ['Structural Analysis','Soil Mechanics','Hydraulics','Concrete Technology','Surveying'],
  'Information Technology': ['Web Technologies','Cloud Computing','Cybersecurity','AI & ML','Software Engineering'],
};

function getSubjectsForDept(dept) {
  return DEPT_SUBJECTS[dept] || DEFAULT_SUBJECTS;
}

function openAddStudent() {
  showModal(`
    <div class="modal-header">
      <div class="modal-title">Add New Student</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Student Name *</label><input id="f_name" placeholder="Full name"></div>
      <div class="form-group"><label>Roll Number *</label><input id="f_roll" placeholder="e.g. CS013"></div>
      <div class="form-group">
        <label>Department *</label>
        <select id="f_dept" onchange="updateSubjectDefaults()">
          <option value="">Select Department</option>
          ${Object.keys(DEPT_SUBJECTS).map(d=>`<option>${d}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Semester *</label>
        <select id="f_sem">${[1,2,3,4,5,6,7,8].map(s=>`<option value="${s}">Semester ${s}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Attendance (%)</label><input id="f_att" type="number" min="0" max="100" value="85"></div>
      <div class="form-group"><label>Email</label><input id="f_email" type="email" placeholder="student@email.com"></div>
    </div>
    <div style="margin-top:20px">
      <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">Subject Marks (Internal /30 · Final /70)</div>
      <div id="subjectInputs"></div>
      <button class="add-subject-btn" onclick="addSubjectRow()">+ Add Subject</button>
    </div>
    <div style="display:flex;gap:12px;margin-top:24px;justify-content:flex-end">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddStudent()">Add Student</button>
    </div>
  `);
  updateSubjectDefaults();
}

function updateSubjectDefaults() {
  const dept = document.getElementById('f_dept')?.value;
  const subjects = getSubjectsForDept(dept);
  const container = document.getElementById('subjectInputs');
  if (!container) return;
  container.innerHTML = '';
  subjects.forEach(s => addSubjectRow(s));
}

let subjectRowCount = 0;
function addSubjectRow(name='') {
  subjectRowCount++;
  const id = subjectRowCount;
  const container = document.getElementById('subjectInputs');
  const row = document.createElement('div');
  row.className = 'subject-input-row';
  row.id = `sr_${id}`;
  row.innerHTML = `
    <input placeholder="Subject name" value="${name}" class="subj-name">
    <input type="number" min="0" max="30" placeholder="Internal" class="subj-int">
    <input type="number" min="0" max="70" placeholder="Final" class="subj-fin">
    <button class="remove-subject-btn" onclick="document.getElementById('sr_${id}').remove()">×</button>
  `;
  container.appendChild(row);
}

function collectSubjects() {
  const rows = document.querySelectorAll('#subjectInputs .subject-input-row');
  return Array.from(rows).map(row => ({
    subject_name: row.querySelector('.subj-name').value,
    internal_marks: parseFloat(row.querySelector('.subj-int').value) || 0,
    final_marks: parseFloat(row.querySelector('.subj-fin').value) || 0,
  })).filter(s => s.subject_name.trim());
}

async function submitAddStudent() {
  const name = document.getElementById('f_name').value.trim();
  const roll = document.getElementById('f_roll').value.trim();
  const dept = document.getElementById('f_dept').value;
  const sem = document.getElementById('f_sem').value;
  const att = document.getElementById('f_att').value;
  const email = document.getElementById('f_email').value;
  if (!name || !roll || !dept) { alert('Please fill in all required fields.'); return; }
  const subjects = collectSubjects();
  const res = await fetch('/api/students', {
    method: 'POST', credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name, roll_number: roll, department: dept, semester: parseInt(sem), attendance: parseFloat(att)||0, email, subjects })
  });
  const data = await res.json();
  if (res.ok) { closeModal(); await renderStudents(true); }
  else { alert(data.error || 'Error adding student'); }
}

async function openEditStudent(sid) {
  const s = await apiFetch(`/api/students/${sid}`);
  if (!s) return;
  showModal(`
    <div class="modal-header">
      <div class="modal-title">Edit Student — ${s.name}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Name</label><input id="e_name" value="${s.name}"></div>
      <div class="form-group"><label>Roll Number</label><input value="${s.roll}" disabled style="opacity:0.5"></div>
      <div class="form-group">
        <label>Department</label>
        <select id="e_dept">
          ${Object.keys(DEPT_SUBJECTS).map(d=>`<option ${d===s.dept?'selected':''}>${d}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Semester</label>
        <select id="e_sem">${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}" ${n==s.semester?'selected':''}>Semester ${n}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Attendance (%)</label><input id="e_att" type="number" value="${s.attendance}"></div>
      <div class="form-group"><label>Email</label><input id="e_email" value="${s.email||''}"></div>
    </div>
    <div style="margin-top:20px">
      <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">Subject Marks</div>
      <div id="subjectInputs">
        ${s.subjects.map(sub => `
          <div class="subject-input-row" id="sr_e_${sub.name.replace(/\s/g,'_')}">
            <input class="subj-name" value="${sub.name}">
            <input type="number" min="0" max="30" class="subj-int" value="${sub.internal}">
            <input type="number" min="0" max="70" class="subj-fin" value="${sub.final}">
            <button class="remove-subject-btn" onclick="this.parentElement.remove()">×</button>
          </div>
        `).join('')}
      </div>
      <button class="add-subject-btn" onclick="addSubjectRow()">+ Add Subject</button>
    </div>
    <div style="display:flex;gap:12px;margin-top:24px;justify-content:flex-end">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEditStudent(${sid})">Save Changes</button>
    </div>
  `);
}

async function submitEditStudent(sid) {
  const name = document.getElementById('e_name').value.trim();
  const dept = document.getElementById('e_dept').value;
  const sem = document.getElementById('e_sem').value;
  const att = document.getElementById('e_att').value;
  const email = document.getElementById('e_email').value;
  const subjects = collectSubjects();
  const res = await fetch(`/api/students/${sid}`, {
    method: 'PUT', credentials: 'include',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ name, department: dept, semester: parseInt(sem), attendance: parseFloat(att)||0, email, subjects })
  });
  if (res.ok) { closeModal(); await renderStudents(true); }
  else { const d = await res.json(); alert(d.error||'Error'); }
}

async function deleteStudent(sid, name) {
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
  const res = await fetch(`/api/students/${sid}`, { method: 'DELETE', credentials: 'include' });
  if (res.ok) await renderStudents(true);
}

async function viewStudent(sid) {
  const [s, summary] = await Promise.all([
    apiFetch(`/api/students/${sid}`),
    apiFetch(`/api/analytics/summary/${sid}`)
  ]);
  if (!s) return;
  showModal(`
    <div class="modal-header">
      <div>
        <div class="modal-title">${s.name}</div>
        <div style="font-size:13px;color:var(--text2);margin-top:2px">${s.roll} · ${s.dept} · Sem ${s.semester}</div>
      </div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>

    ${summary ? `<div class="alert alert-info" style="margin-bottom:16px">🤖 ${summary.summary}</div>` : ''}

    <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap">
      <div class="stat-card" style="flex:1;min-width:120px;padding:14px">
        <div class="stat-label">Overall</div>
        <div class="stat-value" style="font-size:24px">${s.avg_percentage}%</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:120px;padding:14px">
        <div class="stat-label">Attendance</div>
        <div class="stat-value" style="font-size:24px;color:${s.attendance>=75?'var(--success)':'var(--danger)'}">${s.attendance}%</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:120px;padding:14px">
        <div class="stat-label">Rank</div>
        <div class="stat-value" style="font-size:24px">${summary?.peer?.rank||'-'}/${summary?.peer?.total_in_dept||'-'}</div>
      </div>
    </div>

    <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">Subject Performance</div>
    <div class="subjects-grid">
      ${s.subjects.map(sub => {
        const pct = sub.percentage;
        const color = pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
        return `<div class="subject-row">
          <div class="subject-name">${sub.name}</div>
          <div class="subject-marks">Int: ${sub.internal}/30 · Final: ${sub.final}/70</div>
          <div style="flex:1;margin: 0 12px"><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div></div>
          <div class="subject-pct" style="color:${color}">${pct}%</div>
        </div>`;
      }).join('')}
    </div>
  `);
}

// ════════════════════════════════════════════════════════════
//  ANALYTICS PAGE
// ════════════════════════════════════════════════════════════
async function renderAnalytics() {
  const el = document.getElementById('page-analytics');
  el.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Running analytics…</span></div>`;

  const [health, risk, att, talents] = await Promise.all([
    apiFetch('/api/analytics/class-health'),
    apiFetch('/api/analytics/risk'),
    apiFetch('/api/analytics/attendance'),
    apiFetch('/api/analytics/talents')
  ]);
  if (!health) return;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Analytics</div>
        <div class="page-subtitle">AI-powered academic intelligence & insights</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Class Health Score</div><span class="card-badge">Overall</span></div>
        <div class="score-ring-wrap">
          <div class="score-ring">
            <svg viewBox="0 0 100 100" width="100" height="100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" stroke-width="8"/>
              <circle cx="50" cy="50" r="42" fill="none" stroke="url(#grad)" stroke-width="8"
                stroke-dasharray="${health.overall_health * 2.638} 264" stroke-linecap="round"/>
              <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#4f8ef7"/><stop offset="100%" stop-color="#7c3aed"/>
              </linearGradient></defs>
            </svg>
            <div class="score-ring-val">${health.overall_health}%</div>
          </div>
          <div>
            <div style="font-size:22px;font-weight:700">${health.pass_rate}% Pass Rate</div>
            <div style="font-size:13px;color:var(--text2);margin-top:4px">${health.pass_count} of ${health.total_students} students passing</div>
            <div style="font-size:13px;color:var(--text2);margin-top:4px">Highest: ${health.highest_avg}% · Lowest: ${health.lowest_avg}%</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Attendance vs Performance</div><span class="card-badge">Correlation: ${att.correlation}</span></div>
        <div class="chart-container"><canvas id="attChart"></canvas></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">⚠️ Academic Risk Early-Warning System</div><span class="card-badge">${risk.length} students at risk</span></div>
      ${renderRiskTable(risk)}
    </div>

    <div class="grid-3">
      <div class="card">
        <div class="card-header"><div class="card-title">🌟 Top Performers</div></div>
        ${renderTalentList(talents.top_performers, 'avg_percentage')}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">⚡ Fast Learners</div></div>
        ${renderTalentList(talents.fast_learners, 'avg_improvement', '↑')}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">💎 Consistent Performers</div></div>
        ${renderTalentList(talents.consistent_performers, 'std_dev', '±', true)}
      </div>
    </div>
  `;

  destroyChart('attChart');
  charts['attChart'] = new Chart(document.getElementById('attChart'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Students',
        data: att.data.map(d => ({x: d.attendance, y: d.avg_percentage, label: d.name})),
        backgroundColor: 'rgba(79,142,247,0.6)',
        borderColor: '#4f8ef7',
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      ...chartDefaults(),
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.raw.label}: Att ${ctx.raw.x}%, Avg ${ctx.raw.y}%` } }
      },
      scales: {
        x: { title: { display: true, text: 'Attendance %', color: '#8a9bb8' }, ...chartDefaults().scales.x },
        y: { title: { display: true, text: 'Avg Score %', color: '#8a9bb8' }, ...chartDefaults().scales.y }
      }
    }
  });
}

function renderRiskTable(risk) {
  if (!risk.length) return `<div class="empty-state"><div class="empty-icon">✅</div>No at-risk students detected!</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>Student</th><th>Dept</th><th>Avg %</th><th>Attendance</th><th>Risk Level</th><th>Reasons</th></tr></thead>
    <tbody>
      ${risk.map(s => `<tr>
        <td><strong>${s.name}</strong><br><small style="color:var(--text2)">${s.roll}</small></td>
        <td>${s.dept}</td>
        <td>${s.avg_percentage}%</td>
        <td style="color:${s.attendance>=75?'var(--success)':'var(--danger)'}">${s.attendance}%</td>
        <td><span class="badge badge-${s.risk_level==='HIGH'?'danger':s.risk_level==='MEDIUM'?'warning':'success'}">${s.risk_level}</span></td>
        <td style="font-size:12px;color:var(--text2)">${s.reasons.join(' · ')}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function renderTalentList(list, scoreKey, suffix='%', invertBest=false) {
  if (!list || !list.length) return `<div class="empty-state" style="padding:30px">No data</div>`;
  return list.slice(0,5).map((s,i) => {
    const score = s[scoreKey];
    const display = invertBest ? `±${Math.abs(score).toFixed(1)}` : `${score}${suffix}`;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:24px;height:24px;background:rgba(79,142,247,0.15);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--accent)">${i+1}</div>
      <div style="flex:1"><div style="font-weight:600;font-size:14px">${s.name}</div><div style="font-size:12px;color:var(--text2)">${s.dept}</div></div>
      <div style="font-family:'DM Mono';font-size:14px;font-weight:700;color:var(--accent)">${display}</div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════════
//  PREDICTION PAGE
// ════════════════════════════════════════════════════════════
let predStudentId = null;
let predStudentData = null;

async function renderPrediction() {
  const el = document.getElementById('page-prediction');
  const students = await apiFetch('/api/students');
  if (!students) return;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Prediction & Analysis</div>
        <div class="page-subtitle">What-If simulation · Peer comparison · AI study strategy</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-title">Select Student</div></div>
      <select id="predStudentSelect" onchange="loadPredStudent()" style="max-width:400px">
        <option value="">-- Choose a student --</option>
        ${students.map(s => `<option value="${s.id}">${s.name} (${s.roll}) · ${s.dept}</option>`).join('')}
      </select>
    </div>

    <div id="predContent"></div>
  `;
}

async function loadPredStudent() {
  const sid = document.getElementById('predStudentSelect').value;
  if (!sid) return;
  predStudentId = parseInt(sid);
  const el = document.getElementById('predContent');
  el.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  const [strategy, peer] = await Promise.all([
    apiFetch(`/api/analytics/study-strategy/${sid}`),
    apiFetch(`/api/analytics/peer-comparison/${sid}`)
  ]);
  predStudentData = strategy?.student;

  el.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">🤖 AI Study Strategy</div></div>
        <div class="alert alert-info" style="margin-bottom:16px">${strategy.overall_summary}</div>
        ${strategy.strategies.map(s => `
          <div class="alert alert-${s.priority==='HIGH'?'danger':s.priority==='MEDIUM'?'warning':'success'}" style="flex-direction:column;gap:4px">
            <strong>${s.subject}</strong>
            <span style="font-size:12px">${s.message}</span>
          </div>
        `).join('')}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">👥 Peer Comparison</div><span class="card-badge">Dept Rank ${peer.rank}/${peer.total_in_dept}</span></div>
        <div style="margin-bottom:16px">
          <div style="font-size:13px;color:var(--text2);margin-bottom:6px">Percentile</div>
          <div style="font-size:32px;font-weight:700;color:var(--accent)">${peer.percentile}th</div>
        </div>
        ${['avg_percentage'].concat(strategy.student.subject_percentages ? Object.keys(strategy.student.subject_percentages) : []).map(key => {
          if (key === 'avg_percentage') {
            return peerBar('Overall', strategy.student.avg_percentage, peer.class_average, peer.topper.avg_percentage);
          }
          const myVal = strategy.student.subject_percentages[key] || 0;
          const classVal = peer.topper.subject_percentages?.[key] || 0;
          return peerBar(key, myVal, null, classVal);
        }).slice(0,4).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">🔮 What-If Simulation</div><span class="card-badge">Drag to adjust marks</span></div>
      <div id="whatIfForm">${buildWhatIfForm(strategy.student.subjects)}</div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="runWhatIf()">Run Simulation →</button>
      <div id="whatIfResult"></div>
    </div>
  `;
}

function peerBar(label, mine, classAvg, topperVal) {
  return `<div class="peer-bar-row">
    <div class="peer-bar-label"><span>${label.length>20?label.slice(0,20)+'…':label}</span><span style="color:var(--accent)">${mine}%</span></div>
    <div style="position:relative;height:8px;background:var(--border);border-radius:4px;overflow:visible">
      <div style="height:100%;width:${mine}%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:4px"></div>
      ${classAvg ? `<div style="position:absolute;top:-3px;width:2px;height:14px;background:var(--success);left:${classAvg}%" title="Class avg: ${classAvg}%"></div>` : ''}
      <div style="position:absolute;top:-3px;width:2px;height:14px;background:var(--gold);left:${topperVal}%" title="Topper: ${topperVal}%"></div>
    </div>
    <div style="display:flex;gap:16px;margin-top:4px;font-size:10px;color:var(--muted)">
      ${classAvg ? `<span style="color:var(--success)">▌ Class avg: ${classAvg}%</span>` : ''}
      <span style="color:var(--gold)">▌ Topper: ${topperVal}%</span>
    </div>
  </div>`;
}

function buildWhatIfForm(subjects) {
  return subjects.map(s => `
    <div class="what-if-row">
      <div style="font-size:14px;font-weight:500">${s.name}</div>
      <input type="number" min="0" max="30" value="${s.internal}" data-subj="${s.name}" data-type="internal" class="wi-input" placeholder="Int /30" style="text-align:center">
      <input type="number" min="0" max="70" value="${s.final}" data-subj="${s.name}" data-type="final" class="wi-input" placeholder="Final /70" style="text-align:center">
    </div>
  `).join('');
}

async function runWhatIf() {
  const inputs = document.querySelectorAll('.wi-input');
  const changes = {};
  inputs.forEach(inp => {
    const subj = inp.dataset.subj;
    if (!changes[subj]) changes[subj] = {};
    changes[subj][inp.dataset.type] = parseFloat(inp.value) || 0;
  });
  const res = await apiFetch(`/api/analytics/what-if/${predStudentId}`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({changes})
  });
  const el = document.getElementById('whatIfResult');
  const diff = res.improvement;
  const diffColor = diff >= 0 ? 'var(--success)' : 'var(--danger)';
  el.innerHTML = `
    <div class="prediction-result">
      <div style="display:flex;gap:32px;align-items:center;flex-wrap:wrap">
        <div><div style="font-size:12px;color:var(--text2)">Original</div><div style="font-size:28px;font-weight:700">${res.original_avg}%</div></div>
        <div style="font-size:28px;color:var(--text2)">→</div>
        <div><div style="font-size:12px;color:var(--text2)">Predicted</div><div style="font-size:28px;font-weight:700;color:var(--accent)">${res.predicted_avg}%</div></div>
        <div><div style="font-size:12px;color:var(--text2)">Change</div><div style="font-size:28px;font-weight:700;color:${diffColor}">${diff >= 0 ? '+' : ''}${diff}%</div></div>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
//  LEADERBOARD PAGE
// ════════════════════════════════════════════════════════════
async function renderLeaderboard() {
  const el = document.getElementById('page-leaderboard');
  el.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Computing rankings…</span></div>`;
  const lb = await apiFetch('/api/analytics/leaderboard');
  if (!lb) return;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🏆 Leaderboard</div>
        <div class="page-subtitle">Rankings, achievements, and talent recognition</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">🥇 Top Performers</div><span class="card-badge">By Score</span></div>
        ${lb.top_performers.map((s,i) => lbItem(s,i,'avg_percentage','%')).join('')}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">⚡ Fast Learners</div><span class="card-badge">Score Improvement</span></div>
        ${lb.fast_learners.map((s,i) => lbItem(s,i,'avg_improvement','↑')).join('')}
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">🔁 Most Consistent</div><span class="card-badge">Low Variance</span></div>
        ${lb.most_consistent.map((s,i) => lbItem(s,i,'avg_percentage','%')).join('')}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">💎 Hidden Gems</div><span class="card-badge">High Potential</span></div>
        ${lb.hidden_gems.length ? lb.hidden_gems.map((s,i) => lbItem(s,i,'avg_percentage','%')).join('') : `<div class="empty-state" style="padding:40px">No hidden gems found<br><small>Students with high scores and low attendance</small></div>`}
      </div>
    </div>
  `;
}

function lbItem(s, i, scoreKey, suffix) {
  const score = s[scoreKey];
  return `<div class="leaderboard-item">
    <div class="lb-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">#${i+1}</div>
    <div>
      <div class="lb-name">${s.name}</div>
      <div class="lb-dept">${s.dept} · Sem ${s.semester}</div>
    </div>
    <div class="lb-score">${score}${suffix}</div>
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  SETTINGS PAGE
// ════════════════════════════════════════════════════════════
function renderSettings() {
  const el = document.getElementById('page-settings');
  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Settings</div>
        <div class="page-subtitle">System configuration & account management</div>
      </div>
    </div>

    <div class="grid-2">
      <div>
        <div class="settings-section">
          <div class="settings-title">Academic Thresholds</div>
          <div class="settings-row">
            <div><div class="settings-label">Pass Mark Threshold</div><div class="settings-desc">Minimum % to pass a subject</div></div>
            <input type="number" value="40" style="width:80px;text-align:center">
          </div>
          <div class="settings-row">
            <div><div class="settings-label">At-Risk Threshold</div><div class="settings-desc">Flag students below this avg %</div></div>
            <input type="number" value="50" style="width:80px;text-align:center">
          </div>
          <div class="settings-row">
            <div><div class="settings-label">Min Attendance %</div><div class="settings-desc">Alert below this attendance</div></div>
            <input type="number" value="75" style="width:80px;text-align:center">
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-title">Account</div>
          <div class="settings-row">
            <div><div class="settings-label">Change Password</div><div class="settings-desc">Update your login credentials</div></div>
            <button class="btn btn-outline btn-sm">Update</button>
          </div>
          <div class="settings-row">
            <div><div class="settings-label">Sign Out</div><div class="settings-desc">Log out of SRIS</div></div>
            <button class="btn btn-danger btn-sm" onclick="logout()">Sign Out</button>
          </div>
        </div>
      </div>

      <div>
        <div class="settings-section">
          <div class="settings-title">System Info</div>
          <div class="card">
            <div style="display:flex;flex-direction:column;gap:14px">
              ${infoRow('System', 'Student Result Intelligence System')}
              ${infoRow('Version', 'v1.0.0')}
              ${infoRow('Backend', 'Python Flask + SQLAlchemy')}
              ${infoRow('Database', 'SQLite')}
              ${infoRow('AI Engine', 'NumPy + Scikit-learn')}
              ${infoRow('Charts', 'Chart.js 4')}
            </div>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-title">Quick Actions</div>
          <div class="card" style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-outline" onclick="navigateTo('students')">👤 Manage Students</button>
            <button class="btn btn-outline" onclick="navigateTo('analytics')">📊 View Analytics</button>
            <button class="btn btn-outline" onclick="navigateTo('leaderboard')">🏆 Leaderboard</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function infoRow(label, val) {
  return `<div style="display:flex;justify-content:space-between;font-size:13px;padding-bottom:12px;border-bottom:1px solid var(--border)">
    <span style="color:var(--text2)">${label}</span>
    <span style="font-family:'DM Mono';font-size:12px">${val}</span>
  </div>`;
}

// ── Modal helpers ─────────────────────────────────────────────
function showModal(html) {
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('modal').onclick = e => { if(e.target.id==='modal') closeModal(); };
}
function closeModal() {
  document.getElementById('modal').style.display = 'none';
}
