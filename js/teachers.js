(async function () {
  const content = renderShell("teachers.html", "Teachers", "Manage teacher records");
  const auth = await requireAuth();
  if (!auth) return;

  let classes = [];
  let editingId = null;

  content.innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="searchInput" placeholder="Search by name or code..." />
        <select id="classFilter"><option value="">All Classes</option></select>
        <select id="statusFilter">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <button class="btn btn-primary" id="addBtn">+ Add Teacher</button>
    </div>
    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Teacher</th><th>Code</th><th>Email</th><th>Phone</th><th>Class</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="tbody"><tr><td colspan="7" class="empty-state">Loading...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  buildModal();
  await loadClasses();
  await loadTeachers();

  document.getElementById("addBtn").onclick = () => openModal();
  document.getElementById("searchInput").oninput = debounce(loadTeachers, 300);
  document.getElementById("classFilter").onchange = loadTeachers;
  document.getElementById("statusFilter").onchange = loadTeachers;

  async function loadClasses() {
    const { data } = await supabase.from("classes").select("*").order("name");
    classes = data || [];
    const sel = document.getElementById("classFilter");
    sel.innerHTML = `<option value="">All Classes</option>` + classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}${c.section ? " - " + escapeHtml(c.section) : ""}</option>`).join("");
  }

  async function loadTeachers() {
    const tbody = document.getElementById("tbody");
    const search = document.getElementById("searchInput").value.trim();
    const classId = document.getElementById("classFilter").value;
    const status = document.getElementById("statusFilter").value;

    let query = supabase.from("teachers").select("*").order("created_at", { ascending: false });
    if (search) query = query.or(`full_name.ilike.%${search}%,teacher_code.ilike.%${search}%`);
    if (classId) query = query.eq("class_id", classId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No teachers found.</td></tr>`;
      return;
    }

    tbody.innerHTML = data
      .map((t) => {
        const cls = classes.find((c) => c.id === t.class_id);
        return `
        <tr>
          <td><div class="person">
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.full_name)}" />
            ${escapeHtml(t.full_name)}
          </div></td>
          <td>${escapeHtml(t.teacher_code)}</td>
          <td>${escapeHtml(t.email || "-")}</td>
          <td>${escapeHtml(t.phone || "-")}</td>
          <td>${cls ? escapeHtml(cls.name) + (cls.section ? " - " + escapeHtml(cls.section) : "") : "-"}</td>
          <td><span class="badge ${t.status === "active" ? "present" : "absent"}">${t.status}</span></td>
          <td>
            <button class="btn btn-outline btn-sm" data-edit="${t.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-del="${t.id}">Delete</button>
          </td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => openModal(data.find((t) => t.id === b.dataset.edit))));
    tbody.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => deleteTeacher(b.dataset.del)));
  }

  async function deleteTeacher(id) {
    if (!confirm("Delete this teacher? This cannot be undone.")) return;
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    toast("Teacher deleted");
    loadTeachers();
  }

  function buildModal() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "teacherModal";
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <h3 id="modalTitle">Add Teacher</h3>
          <button class="modal-close" id="modalClose">&times;</button>
        </div>
        <form id="teacherForm">
          <div class="form-group"><label>Full Name</label><input type="text" id="f_name" required /></div>
          <div class="form-row">
            <div class="form-group"><label>Teacher Code</label><input type="text" id="f_code" required /></div>
            <div class="form-group"><label>Status</label>
              <select id="f_status"><option value="active">Active</option><option value="inactive">Inactive</option></select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Email</label><input type="email" id="f_email" /></div>
            <div class="form-group"><label>Phone</label><input type="text" id="f_phone" /></div>
          </div>
          <div class="form-group"><label>Class</label><select id="f_class"><option value="">— None —</option></select></div>
          <button type="submit" class="btn btn-primary btn-block">Save Teacher</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("modalClose").onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    document.getElementById("teacherForm").onsubmit = saveTeacher;
  }

  function openModal(teacher) {
    editingId = teacher?.id || null;
    document.getElementById("modalTitle").textContent = teacher ? "Edit Teacher" : "Add Teacher";
    document.getElementById("f_name").value = teacher?.full_name || "";
    document.getElementById("f_code").value = teacher?.teacher_code || "";
    document.getElementById("f_email").value = teacher?.email || "";
    document.getElementById("f_phone").value = teacher?.phone || "";
    document.getElementById("f_status").value = teacher?.status || "active";
    const classSel = document.getElementById("f_class");
    classSel.innerHTML = `<option value="">— None —</option>` + classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}${c.section ? " - " + escapeHtml(c.section) : ""}</option>`).join("");
    classSel.value = teacher?.class_id || "";
    document.getElementById("teacherModal").classList.add("open");
  }

  function closeModal() {
    document.getElementById("teacherModal").classList.remove("open");
  }

  async function saveTeacher(e) {
    e.preventDefault();
    const payload = {
      full_name: document.getElementById("f_name").value.trim(),
      teacher_code: document.getElementById("f_code").value.trim(),
      email: document.getElementById("f_email").value.trim() || null,
      phone: document.getElementById("f_phone").value.trim() || null,
      status: document.getElementById("f_status").value,
      class_id: document.getElementById("f_class").value || null,
    };

    const { error } = editingId
      ? await supabase.from("teachers").update(payload).eq("id", editingId)
      : await supabase.from("teachers").insert([payload]);

    if (error) return toast(error.message, "error");
    toast(editingId ? "Teacher updated" : "Teacher added");
    closeModal();
    loadTeachers();
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
})();
