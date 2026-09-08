(async function () {
  const content = renderShell("classes.html", "Classes", "Manage classes & sections");
  const auth = await requireAuth();
  if (!auth) return;

  let editingId = null;

  content.innerHTML = `
    <div class="toolbar">
      <div class="filters"><input type="text" id="searchInput" placeholder="Search class..." /></div>
      <button class="btn btn-primary" id="addBtn">+ Add Class</button>
    </div>
    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Class</th><th>Section</th><th>Academic Year</th><th>Students</th><th>Actions</th></tr></thead>
          <tbody id="tbody"><tr><td colspan="5" class="empty-state">Loading...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  buildModal();
  await loadClasses();
  document.getElementById("addBtn").onclick = () => openModal();
  document.getElementById("searchInput").oninput = debounce(loadClasses, 300);

  async function loadClasses() {
    const tbody = document.getElementById("tbody");
    const search = document.getElementById("searchInput").value.trim();
    let query = supabase.from("classes").select("*").order("name");
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No classes found.</td></tr>`;
      return;
    }

    const counts = await Promise.all(data.map((c) => supabase.from("students").select("*", { count: "exact", head: true }).eq("class_id", c.id)));

    tbody.innerHTML = data
      .map(
        (c, i) => `
      <tr>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.section || "-")}</td>
        <td>${escapeHtml(c.academic_year || "-")}</td>
        <td>${counts[i].count ?? 0}</td>
        <td>
          <button class="btn btn-outline btn-sm" data-edit="${c.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-del="${c.id}">Delete</button>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => openModal(data.find((c) => c.id === b.dataset.edit))));
    tbody.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => deleteClass(b.dataset.del)));
  }

  async function deleteClass(id) {
    if (!confirm("Delete this class?")) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    toast("Class deleted");
    loadClasses();
  }

  function buildModal() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "classModal";
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-head"><h3 id="modalTitle">Add Class</h3><button class="modal-close" id="modalClose">&times;</button></div>
        <form id="classForm">
          <div class="form-group"><label>Class Name</label><input type="text" id="f_name" placeholder="e.g. Class 10" required /></div>
          <div class="form-row">
            <div class="form-group"><label>Section</label><input type="text" id="f_section" placeholder="e.g. A" /></div>
            <div class="form-group"><label>Academic Year</label><input type="text" id="f_year" placeholder="2024-2025" /></div>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Save Class</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("modalClose").onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    document.getElementById("classForm").onsubmit = saveClass;
  }

  function openModal(cls) {
    editingId = cls?.id || null;
    document.getElementById("modalTitle").textContent = cls ? "Edit Class" : "Add Class";
    document.getElementById("f_name").value = cls?.name || "";
    document.getElementById("f_section").value = cls?.section || "";
    document.getElementById("f_year").value = cls?.academic_year || "2024-2025";
    document.getElementById("classModal").classList.add("open");
  }

  function closeModal() {
    document.getElementById("classModal").classList.remove("open");
  }

  async function saveClass(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById("f_name").value.trim(),
      section: document.getElementById("f_section").value.trim() || null,
      academic_year: document.getElementById("f_year").value.trim() || "2024-2025",
    };
    const { error } = editingId
      ? await supabase.from("classes").update(payload).eq("id", editingId)
      : await supabase.from("classes").insert([payload]);
    if (error) return toast(error.message, "error");
    toast(editingId ? "Class updated" : "Class added");
    closeModal();
    loadClasses();
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
})();
