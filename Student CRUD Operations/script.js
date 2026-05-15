const API_BASE = "https://jsonplaceholder.typicode.com";
const LIST_URL = `${API_BASE}/users`;

const UI = {
  list: document.getElementById("list"),
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  count: document.getElementById("count"),
  search: document.getElementById("search"),

  btnReload: document.getElementById("btnReload"),

  addName: document.getElementById("addName"),
  addEmail: document.getElementById("addEmail"),
  addMajor: document.getElementById("addMajor"),
  addGpa: document.getElementById("addGpa"),
  btnAdd: document.getElementById("btnAdd"),
  btnClear: document.getElementById("btnClear"),

  backdrop: document.getElementById("backdrop"),
  editName: document.getElementById("editName"),
  editEmail: document.getElementById("editEmail"),
  editMajor: document.getElementById("editMajor"),
  editGpa: document.getElementById("editGpa"),
  editMeta: document.getElementById("editMeta"),
  btnCancel: document.getElementById("btnCancel"),
  btnUpdate: document.getElementById("btnUpdate"),
  btnDelete: document.getElementById("btnDelete"),

  toast: document.getElementById("toast"),
};

let students = [];

let editingId = null;

const MAJORS = [
  "Computer Science",
  "Software Engineering",
  "Information Systems",
  "Cybersecurity",
  "Data Science",
];

function showToast(message) {
  UI.toast.textContent = message || "";
  UI.toast.classList.remove("hidden");
  UI.toast.classList.add("visible");
  setTimeout(() => {
    UI.toast.classList.remove("visible");
    UI.toast.classList.add("hidden");
  }, 2200);
}

function setLoading(isLoading) {
  if (isLoading) {
    UI.loading.classList.remove("hidden");
    UI.loading.classList.add("flex");
  } else {
    UI.loading.classList.remove("flex");
    UI.loading.classList.add("hidden");
  }
}

function setError(message) {
  UI.error.textContent = message;
  if (message) {
    UI.error.classList.remove("hidden");
    UI.error.classList.add("visible");
  } else {
    UI.error.classList.remove("visible");
    UI.error.classList.add("hidden");
  }
}

function openModal() {
  UI.backdrop.classList.remove("hidden");
  UI.backdrop.classList.add("flex");
  UI.backdrop.setAttribute("aria-hidden", "false");
}

function closeModal() {
  UI.backdrop.classList.remove("flex");
  UI.backdrop.classList.add("hidden");
  UI.backdrop.setAttribute("aria-hidden", "true");
  editingId = null;
}

function sanitize(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clampGpa(v) {
  const n = Number(v);
  return Number.isFinite(n)
    ? Math.min(4, Math.max(0, Math.round(n * 10) / 10))
    : 0;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadStudents() {
  UI.btnReload.disabled = true;
  setError("");
  setLoading(true);

  try {
    const users = await apiFetch(LIST_URL, { method: "GET" });

    students = users.map((u) => ({
      id: u.id,
      fullName: u.name,
      email: u.email,
      major: MAJORS[u.id % MAJORS.length],
      gpa: clampGpa(2.6 + (u.id % 15) * 0.1),
    }));

    render();
    showToast("✅ Loaded students");
  } catch (e) {
    setError(`❌ Failed to load students: ${e.message}`);
  } finally {
    setLoading(false);
    UI.btnReload.disabled = false;
  }
}

async function createStudent() {
  const fullName = UI.addName.value.trim();
  const email = UI.addEmail.value.trim();
  const major = UI.addMajor.value;
  const gpa = clampGpa(UI.addGpa.value);

  if (!validateNameAndEmail(fullName, email))
    return showToast("❌ Invalid name or email");

  UI.btnAdd.disabled = true;
  setError("");

  try {
    const created = await apiFetch(`${LIST_URL}`, {
      method: "POST",
      body: JSON.stringify({ name: fullName, email, major, gpa }),
    });

    // save new student locally
    const newStudent = {
      id: created?.id ?? Date.now(),
      fullName,
      email,
      major,
      gpa,
    };

    students.unshift(newStudent);

    UI.addName.value = "";
    UI.addEmail.value = "";
    UI.addMajor.value = "Computer Science";
    UI.addGpa.value = "3.2";

    render();
    showToast("✅ Student created (POST)");
  } catch (e) {
    setError(`❌ Create failed: ${e.message}`);
  } finally {
    UI.btnAdd.disabled = false;
  }
}

function startEdit(id) {
  const editedStudent = students.find((x) => x.id === id);
  if (!editedStudent) return;

  editingId = id;

  UI.editName.value = editedStudent.fullName;
  UI.editEmail.value = editedStudent.email;
  UI.editMajor.value = editedStudent.major;
  UI.editGpa.value = editedStudent.gpa;

  UI.editMeta.textContent = `Editing student id: ${id}`;

  openModal();
}

function validateNameAndEmail(name, email) {
  const emailRegex = /.+@.+\..+/;
  const nameRegex = /[A-Za-z0-9' -]+/;

  if (!nameRegex.test(name)) return false;
  if (!emailRegex.test(email)) return false;
  return true;
}

async function updateStudent() {
  if (editingId == null) return;

  const fullName = UI.editName.value.trim();
  const email = UI.editEmail.value.trim();
  const major = UI.editMajor.value;
  const gpa = clampGpa(UI.editGpa.value);

  if (!validateNameAndEmail(fullName, email))
    return showToast("❌ Invalid name or email");

  UI.btnUpdate.disabled = true;
  setError("");

  const idx = students.findIndex((s) => s.id === editingId);

  const old = { ...students[idx] };

  students[idx] = { ...students[idx], fullName, email, major, gpa };
  render();

  try {
    await apiFetch(`${API_BASE}/users/${editingId}`, {
      method: "PUT",
      body: JSON.stringify({
        id: editingId,
        name: fullName,
        email,
        major,
        gpa,
      }),
    });

    showToast("✅ Student updated (PUT)");
    closeModal();
  } catch (e) {
    students[idx] = old;
    render();
    setError(`❌ Update failed: ${e.message}`);
    showToast("❌ Update failed (reverted)");
  } finally {
    UI.btnUpdate.disabled = false;
  }
}

async function deleteStudent(id) {
  const deletedStudents = students.find((x) => x.id === id);
  if (!deletedStudents) return;

  if (!confirm(`Delete student "${deletedStudents.fullName}"?`)) return;

  setError("");

  const backup = [...students];

  students = students.filter((x) => x.id !== id);
  render();

  try {
    await apiFetch(`${API_BASE}/users/${id}`, { method: "DELETE" });
    showToast("✅ Student deleted");
  } catch (e) {
    students = backup;
    render();
    setError(`❌ Delete failed: ${e.message}`);
    showToast("❌ Delete failed (reverted)");
  }
}

function render() {
  const query = UI.search.value.trim().toLowerCase();

  const filtered = query
    ? students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.major.toLowerCase().includes(query),
      )
    : students;

  UI.count.textContent = `${filtered.length.toLocaleString()} shown`;

  if (filtered.length === 0) {
    UI.list.innerHTML = `<div class="muted">No students found.</div>`;
    return;
  }

  UI.list.innerHTML = filtered
    .map(
      (s) => `
        <div data-id="${s.id}" class="item">
          <div>
            <div class="name">${sanitize(s.fullName)}</div>
            <p class="meta">${sanitize(s.email)}</p>

            <div class="mt-6">
              <span class="pill">Id: ${s.id}</span>
              <span class="pill">Major: ${sanitize(s.major)}</span>
              <span class="pill">GPA: ${Number(s.gpa).toFixed(1)}</span>
            </div>
          </div>

          <div class="actions">
            <button class="secondary" data-action="update">Edit</button>
            <button class="danger" data-action="delete">Delete</button>
          </div>
        </div>
      `,
    )
    .join("");
}

UI.list.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;

  const item = event.target.closest(".item");
  if (!item) return;

  const id = Number(item.dataset.id);
  const action = btn.dataset.action;

  if (action === "update") startEdit(id);
  if (action === "delete") deleteStudent(id);
});

UI.btnReload.addEventListener("click", loadStudents);

UI.btnAdd.addEventListener("click", createStudent);

UI.btnClear.addEventListener("click", () => {
  UI.addName.value = "";
  UI.addEmail.value = "";
  UI.addMajor.value = "Computer Science";
  UI.addGpa.value = "3.2";
});

UI.search.addEventListener("input", render);

UI.btnCancel.addEventListener("click", closeModal);

// Clicking outside modal (on backdrop) closes it
UI.backdrop.addEventListener("click", (e) => {
  if (e.target === UI.backdrop) closeModal();
});

UI.btnUpdate.addEventListener("click", updateStudent);

// Press Escape to close modal
globalThis.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && UI.backdrop.classList.contains("flex"))
    closeModal();
});

// Initial load
loadStudents();
