// Shared UI: sidebar, topbar, auth guard, toast helper.

const NAV_ITEMS = [
  { href: "dashboard.html", icon: "🏠", label: "Dashboard" },
  { href: "attendance.html", icon: "📋", label: "Attendance" },
  { href: "teachers.html", icon: "👨‍🏫", label: "Teachers" },
  { href: "students.html", icon: "🎓", label: "Students" },
  { href: "classes.html", icon: "🏫", label: "Classes" },
  { href: "reports.html", icon: "📊", label: "Reports" },
];

function toast(msg, type = "info") {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = type === "error" ? "#ef4444" : "#1e293b";
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function renderShell(activePage, pageTitle, pageSub) {
  const page = document.getElementById("page-root");
  const navHtml = NAV_ITEMS.map(
    (item) => `
    <a href="${item.href}" class="${item.href === activePage ? "active" : ""}">
      <span class="ic">${item.icon}</span> ${item.label}
    </a>`
  ).join("");

  const shell = document.createElement("div");
  shell.className = "app";
  shell.innerHTML = `
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <div class="logo">📚</div>
        <div>AttendSmart<br><small>Attendance System</small></div>
      </div>
      <nav>${navHtml}</nav>
      <div class="year">🎓 <div>Academic Year<br><strong>2024 - 2025</strong></div></div>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="left" style="display:flex;align-items:center;gap:12px">
          <button class="menu-toggle" id="menuToggle">☰</button>
          <div>
            <h1>${pageTitle}</h1>
            <p>${pageSub}</p>
          </div>
        </div>
        <div class="right">
          <div class="search-box">🔍 <input placeholder="Search (Ctrl+/)" /></div>
          <div class="date-pill">📅 <span id="todayDate"></span></div>
          <div class="user-chip" id="userChip">
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=User" alt="" />
            <div>
              <div class="name" id="userName">Loading...</div>
              <div class="role" id="userRole"></div>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" id="logoutBtn">Logout</button>
        </div>
      </header>
      <main class="content" id="pageContent"></main>
    </div>
  `;
  page.appendChild(shell);

  document.getElementById("todayDate").textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  document.getElementById("menuToggle").onclick = () => {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebarOverlay").classList.toggle("show");
  };
  document.getElementById("sidebarOverlay").onclick = () => {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarOverlay").classList.remove("show");
  };
  document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  };

  return document.getElementById("pageContent");
}

async function requireAuth() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return null;
  }
  const user = data.session.user;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const nameEl = document.getElementById("userName");
  const roleEl = document.getElementById("userRole");
  if (nameEl) nameEl.textContent = profile?.full_name || user.email;
  if (roleEl) roleEl.textContent = profile?.role === "teacher" ? "Teacher" : "Admin";
  const img = document.querySelector("#userChip img");
  if (img) img.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.full_name || user.email)}`;

  return { user, profile };
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
