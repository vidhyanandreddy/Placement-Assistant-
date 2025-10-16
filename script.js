/* ===== Config ===== */
const APPS_SCRIPT_URL = "http://localhost:4000/api";
const SECRET_TOKEN = "123";
const ADMIN_PASSWORD = "123";

/* ===== UI References ===== */
const loginForm = document.getElementById("loginForm");
const viewLogin = document.getElementById("view-login");
const viewUpload = document.getElementById("view-upload");
const viewAdmin = document.getElementById("view-admin");

const rollInput = document.getElementById("rollInput");
const branchInput = document.getElementById("branchInput");
const loginMessage = document.getElementById("loginMessage");

const emailInput = document.getElementById("emailInput");
const phoneInput = document.getElementById("phoneInput");
const dobInput = document.getElementById("dobInput");
const cgpaInput = document.getElementById("cgpaInput");
const admittedYearInput = document.getElementById("admittedYearInput");
const graduationYearInput = document.getElementById("graduationYearInput");
const instituteInput = document.getElementById("instituteInput");
const backlogsInput = document.getElementById("backlogsInput");
const linkedinInput = document.getElementById("linkedinInput");

const studentInfo = document.getElementById("studentInfo");
const fileInput = document.getElementById("fileInput");
const uploadForm = document.getElementById("uploadForm");
const uploadMessage = document.getElementById("uploadMessage");
const btnSaveDetails = document.getElementById("btn-save-details");
const btnLogout = document.getElementById("btn-logout");

const uploadedList = document.getElementById("uploadedList");
const notUploadedList = document.getElementById("notUploadedList");
const adminSummary = document.getElementById("adminSummary");
const adminMessage = document.getElementById("adminMessage");
const downloadUploaded = document.getElementById("downloadUploaded");
const downloadNotUploaded = document.getElementById("downloadNotUploaded");

const navAdmin = document.getElementById("nav-admin");
const adminPasswordInput = document.getElementById("adminPasswordInput");
const adminPasswordError = document.getElementById("adminPasswordError");
const confirmAdminLogin = document.getElementById("confirmAdminLogin");
const yearNavbar = document.getElementById("yearNavbar");
const btnBackToLogin = document.getElementById("btn-back-to-login");
const btnRefreshAdmin = document.getElementById("btn-refresh-admin");

let currentUser = null;
let allStudentsCache = [];

/* ===== Clear Login Form ===== */
const loginClearBtn = document.getElementById("login-clear");
const admittedYearInputLogin = document.getElementById(
  "admittedYearInputLogin"
);
const passwordInput = document.getElementById("passwordInput"); // added

if (loginClearBtn) {
  loginClearBtn.addEventListener("click", () => {
    rollInput.value = "";
    // branchInput.value = ""; // remove if you no longer use branch
    admittedYearInputLogin.value = "";
    if (passwordInput) passwordInput.value = ""; // clear password field
    loginMessage.innerHTML = "";
  });
}

const togglePassword = document.getElementById("togglePassword");
const togglePasswordIcon = document.getElementById("togglePasswordIcon");

togglePassword.addEventListener("click", () => {
  if (passwordInput.type === "password") {
    passwordInput.type = "text"; // show password
    togglePasswordIcon.classList.remove("bi-eye");
    togglePasswordIcon.classList.add("bi-eye-slash");
  } else {
    passwordInput.type = "password"; // hide password
    togglePasswordIcon.classList.remove("bi-eye-slash");
    togglePasswordIcon.classList.add("bi-eye");
  }
});

/* ===== Navbar Student Button ===== */
const navLogin = document.getElementById("nav-login");

if (navLogin) {
  navLogin.addEventListener("click", () => {
    showView(viewLogin);
  });
}

/* ===== Show View ===== */
function showView(view) {
  [viewLogin, viewUpload, viewAdmin].forEach((v) => v.classList.add("d-none"));
  view.classList.remove("d-none");
}

/* ===== API Calls ===== */
async function apiGet(params = {}) {
  const url = new URL(APPS_SCRIPT_URL);
  Object.keys(params).forEach((k) => url.searchParams.append(k, params[k]));
  return fetch(url).then((r) => r.json());
}

async function apiPost(action, payload = {}) {
  return fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  }).then((r) => r.json());
}

// ====== Student Login  =====
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get inputs and normalize to uppercase for comparison
  const roll = (rollInput.value || "").trim().toUpperCase();
  const admittedYear = (admittedYearInputLogin.value || "").trim();
  const password = (document.getElementById("passwordInput").value || "")
    .trim()
    .toUpperCase();

  if (!roll || !admittedYear || !password) {
    loginMessage.innerHTML = `<div class="text-danger">Enter roll, admitted year, and password</div>`;
    return;
  }

  loginMessage.innerHTML = `<div class="text-info">Verifying...</div>`;

  // Call API to get student
  const res = await apiGet({
    action: "getStudent",
    roll,
  });

  // Compare roll number and password in uppercase (case-insensitive)
  if (
    res?.RollNo &&
    String(res.AdmittedYear) === admittedYear &&
    password === res.RollNo.toUpperCase()
  ) {
    currentUser = res;
    populateStudentForm(currentUser);
    showView(viewUpload);
  } else {
    loginMessage.innerHTML = `<div class="text-danger">Invalid roll, admitted year, or password</div>`;
  }
});

/* ===== Populate Student Form ===== */
function populateStudentForm(user) {
  studentInfo.innerHTML = `
    <div><strong>Roll:</strong> ${escapeHtml(user.RollNo)}</div>
    <div><strong>Name:</strong> ${escapeHtml(user.Name || "")}</div>
    <div><strong>Branch:</strong> ${escapeHtml(user.Branch || "")}</div>
  `;
  emailInput.value = user.Email || "";
  phoneInput.value = user.Phone || "";
  dobInput.value = user.DOB || "";
  cgpaInput.value = user.CGPA || "";
  admittedYearInput.value = user.AdmittedYear || "";
  graduationYearInput.value = user.GraduationYear || "";
  instituteInput.value = user.InstituteName || "";
  backlogsInput.value = user.ActiveBacklogs || 0;
  linkedinInput.value = user.LinkedIn || "";
  uploadMessage.innerHTML = "";
}

/* ===== Logout ===== */
btnLogout.addEventListener("click", () => {
  currentUser = null;
  showView(viewLogin);

  // Clear login fields
  rollInput.value = "";
  admittedYearInputLogin.value = "";
  const passwordInput = document.getElementById("passwordInput");
  if (passwordInput) passwordInput.value = "";

  // Clear messages
  loginMessage.innerHTML = "";
  uploadMessage.innerHTML = "";
});

/* ===== Save Student Details ===== */
btnSaveDetails.addEventListener("click", async () => {
  if (!currentUser) return;
  const roll = currentUser.RollNo;
  const res = await apiPost("updateDetails", {
    secret: SECRET_TOKEN,
    roll,
    email: emailInput.value.trim(),
    phone: phoneInput.value.trim(),
    dob: dobInput.value.trim(),
    cgpa: cgpaInput.value.trim(),
    admittedYear: admittedYearInput.value.trim(),
    graduationYear: graduationYearInput.value.trim(),
    institute: instituteInput.value.trim(),
    backlogs: parseInt(backlogsInput.value.trim()) || 0,
    linkedin: linkedinInput.value.trim(),
  });
  uploadMessage.innerHTML = res?.success
    ? `<div class="text-success">Details updated.</div>`
    : `<div class="text-danger">Update failed.</div>`;
});

/* ===== Upload Resume ===== */
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const f = fileInput.files[0];
  if (!f)
    return (uploadMessage.innerHTML = `<div class="text-danger">Choose PDF</div>`);
  if (f.type !== "application/pdf")
    return (uploadMessage.innerHTML = `<div class="text-danger">Only PDF allowed</div>`);
  if (f.size > 6 * 1024 * 1024)
    return (uploadMessage.innerHTML = `<div class="text-danger">Max 6MB</div>`);

  const { base64, mime } = await fileToBase64(f);
  const payload = {
    secret: SECRET_TOKEN,
    roll: currentUser.RollNo,
    fileName: `${currentUser.RollNo}_resume_${Date.now()}.pdf`,
    mimeType: mime,
    base64,
    email: emailInput.value.trim(),
    phone: phoneInput.value.trim(),
    dob: dobInput.value.trim(),
    cgpa: cgpaInput.value.trim(),
    admittedYear: admittedYearInput.value.trim(),
    graduationYear: graduationYearInput.value.trim(),
    institute: instituteInput.value.trim(),
    backlogs: parseInt(backlogsInput.value.trim()) || 0,
    linkedin: linkedinInput.value.trim(),
  };
  const res = await apiPost("uploadResume", payload);
  uploadMessage.innerHTML = res?.success
    ? `<div class="text-success">Uploaded <a href="${res.url}" target="_blank">Open</a></div>`
    : `<div class="text-danger">Upload failed</div>`;
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parts = reader.result.split(",");
      resolve({ base64: parts[1], mime: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ===== Admin Login ===== */
if (navAdmin) {
  navAdmin.addEventListener("click", () => {
    const modalEl = document.getElementById("adminLoginModal");
    if (!modalEl) return alert("Admin modal missing in HTML!");
    const modal = new bootstrap.Modal(modalEl);
    adminPasswordInput.value = "";
    adminPasswordError.classList.add("d-none");
    modal.show();
  });
}

if (confirmAdminLogin) {
  confirmAdminLogin.addEventListener("click", () => {
    if (adminPasswordInput.value.trim() === ADMIN_PASSWORD) {
      bootstrap.Modal.getInstance(
        document.getElementById("adminLoginModal")
      ).hide();
      loadAdmin();
      showView(viewAdmin);
    } else {
      adminPasswordError.classList.remove("d-none");
    }
  });
}

/* ===== Admin Dashboard ===== */
async function loadAdmin() {
  adminMessage.innerHTML = "";
  uploadedList.innerHTML = "";
  notUploadedList.innerHTML = "";
  adminSummary.innerHTML = "Loading...";

  const all = await apiGet({ action: "getAll" });
  if (!Array.isArray(all)) {
    adminSummary.innerHTML = '<div class="text-danger">Failed to load</div>';
    return;
  }

  allStudentsCache = all;

  const uploaded = all.filter(
    (s) =>
      (s.Uploaded || "").toLowerCase() === "yes" ||
      (s.ResumeLink && s.ResumeLink.length > 5)
  );
  const notUploaded = all.filter((s) => !uploaded.includes(s));

  uploadedList.innerHTML = uploaded.length
    ? uploaded
        .map(
          (s) =>
            `<li>${escapeHtml(s.RollNo)} - ${escapeHtml(
              s.Name || ""
            )} <a href="${s.ResumeLink}" target="_blank">Open</a></li>`
        )
        .join("")
    : "<li>No uploads</li>";

  notUploadedList.innerHTML = notUploaded.length
    ? notUploaded
        .map(
          (s) =>
            `<li>${escapeHtml(s.RollNo)} - ${escapeHtml(s.Name || "")}</li>`
        )
        .join("")
    : "<li>All uploaded</li>";

  downloadUploaded.onclick = () => downloadCSV(uploaded, "uploaded.csv");
  downloadNotUploaded.onclick = () =>
    downloadCSV(notUploaded, "not_uploaded.csv");

  // Default year
  const defaultYear = "2022";
  renderYearBranchData(defaultYear);
  yearNavbar.querySelectorAll("button").forEach((b) => {
    if (b.getAttribute("data-year") === defaultYear) b.classList.add("active");
  });
}

/* ===== Year Filter ===== */
yearNavbar.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const year = btn.getAttribute("data-year");
    renderYearBranchData(year);

    // Update active button
    yearNavbar
      .querySelectorAll("button")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// Convert Google Drive links to direct download
function getDirectLink(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return url;
}

// Render students grouped by branch for a specific year
async function renderYearBranchData(year) {
  adminSummary.innerHTML = "";
  if (!allStudentsCache.length) return;

  const students = allStudentsCache.filter(
    (s) => String(s.AdmittedYear) === String(year)
  );

  if (!students.length) {
    adminSummary.innerHTML = `<div class="text-center text-warning">No students found for ${year}</div>`;
    return;
  }

  // Group by branch
  const branchMap = {};
  students.forEach((s) => {
    const branch = s.Branch || "Unknown";
    if (!branchMap[branch]) branchMap[branch] = [];
    branchMap[branch].push(s);
  });

  // Render each branch card
  for (const branch of Object.keys(branchMap)) {
    const list = branchMap[branch];
    const card = document.createElement("div");
    card.className = "card mb-2 shadow-sm";
    card.style.maxHeight = "250px";
    card.style.overflowY = "auto";

    card.innerHTML = `
      <div class="card-body p-2">
        <div class="d-flex justify-content-between mb-1">
          <h6>${branch} (Total: ${list.length})</h6>
          <div>
            <button class="btn btn-sm btn-outline-primary me-1">Download CSV</button>
            <button class="btn btn-sm btn-outline-success">Download Resumes</button>
          </div>
        </div>
        <ul class="list-group list-group-flush">
          ${list
            .map(
              (
                s
              ) => `<li class="list-group-item d-flex justify-content-between py-1 px-2 small">
                ${escapeHtml(s.Name || s.RollNo || "")}
                <span class="badge ${
                  s.Uploaded === "Yes" ||
                  (s.ResumeLink && s.ResumeLink.length > 5)
                    ? "bg-success"
                    : "bg-danger"
                }">
                  ${
                    s.Uploaded === "Yes" ||
                    (s.ResumeLink && s.ResumeLink.length > 5)
                      ? "Uploaded"
                      : "Not Uploaded"
                  }
                </span>
              </li>`
            )
            .join("")}
        </ul>
      </div>
    `;

    const [csvBtn, resumeBtn] = card.querySelectorAll("button");

    // Download CSV
    csvBtn.addEventListener("click", () =>
      downloadCSV(list, `${branch}_${year}.csv`)
    );

    // Download all resumes (opens all in new tabs with a small delay)
    resumeBtn.addEventListener("click", () => {
      const resumes = list
        .filter((s) => s.ResumeLink && s.ResumeLink.length > 5)
        .map((s) => ({ name: s.Name || s.RollNo, link: s.ResumeLink }));

      if (!resumes.length) return alert("No resumes available");

      fetch("http://localhost:4000/download-resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumes }),
      })
        .then((res) => res.blob())
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "All_Resumes.zip";
          a.click();
          window.URL.revokeObjectURL(url);
        })
        .catch((err) => console.error("Failed to download zip:", err));
    });

    adminSummary.appendChild(card);
  }
}

/* ===== Refresh / Back ===== */
btnBackToLogin.addEventListener("click", () => showView(viewLogin));
btnRefreshAdmin.addEventListener("click", () => loadAdmin());

/* ===== CSV Download ===== */
function downloadCSV(rows, filename = "report.csv") {
  if (!rows?.length) return alert("No rows");
  const headers = [
    "RollNo",
    "Name",
    "DOB",
    "Branch",
    "CGPA",
    "Email",
    "Phone",
    "ResumeLink",
    "Uploaded",
    "AdmittedYear",
    "GraduationYear",
    "InstituteName",
    "ActiveBacklogs",
    "LinkedIn",
  ];
  const csv = [headers.join(",")]
    .concat(
      rows.map((r) =>
        headers
          .map((h) => `"${String(r[h] || "").replace(/"/g, '""')}"`)
          .join(",")
      )
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${filename.replace(".csv", "")}_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const driveForm = document.getElementById("driveForm");

driveForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const body = {
    action: "addDrive",
    secret: SECRET_TOKEN,
    company: document.getElementById("company").value,
    role: document.getElementById("role").value,
    date: document.getElementById("date").value,
    minCGPA: document.getElementById("minCGPA").value,
    branches: document.getElementById("branches").value,
    maxBacklogs: document.getElementById("maxBacklogs").value,
    gradYears: document.getElementById("gradYears").value,
    package: document.getElementById("package").value,
  };

  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (result.success) {
    alert("Drive added successfully!");
    driveForm.reset();
  } else {
    alert("Error: " + JSON.stringify(result));
  }
});
/* ===== Download Eligibility List ===== */
const downloadEligibilityBtn = document.getElementById("downloadEligibilityBtn");

if (downloadEligibilityBtn) {
  downloadEligibilityBtn.addEventListener("click", async () => {
    const driveID = prompt("Enter Drive ID to download eligibility list:");
    if (!driveID) return alert("Drive ID is required.");

    try {
      const response = await fetch(
        `${APPS_SCRIPT_URL}?action=downloadEligibility&driveID=${driveID}`
      );

      if (!response.ok) throw new Error("Failed to fetch eligibility data");

      const csv = await response.text();
      if (!csv || csv.trim() === "") {
        alert("No eligibility data found for this Drive ID");
        return;
      }

      // Trigger CSV download
      const blob = new Blob([csv], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Eligibility_${driveID}.csv`;
      link.click();
    } catch (err) {
      alert("Error downloading eligibility list: " + err.message);
    }
  });
}

/* ===== Utils ===== */
function escapeHtml(str) {
  if (!str && str !== 0) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(str).replace(/[&<>"']/g, (m) => map[m]);
}

// updates line
const updates = [
  "Infosys is visiting PVKKIT next week!",
  "CRM Recruit placed 5 students!",
  "Check your resume status now!",
];

function scrollUpdates() {
  const container = document.getElementById("updatesContainer");
  const content = document.getElementById("updatesContent");

  content.innerHTML = updates.join(" | ");
  let left = container.offsetWidth;

  function step() {
    left--;
    content.style.transform = `translateX(${left}px)`;
    if (-content.offsetWidth > left) left = container.offsetWidth;
    requestAnimationFrame(step);
  }
  step();
}
scrollUpdates();




const driveList = document.getElementById("driveList");
const refreshDrivesBtn = document.getElementById("refreshDrivesBtn");

// Load drives from backend
async function loadAllDrives() {
  if (!driveList) return;

  driveList.innerHTML =
    "<li class='list-group-item text-center text-muted'>Loading drives...</li>";

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getAllDrives`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      driveList.innerHTML =
        "<li class='list-group-item text-center text-muted'>No drives found</li>";
      return;
    }

    driveList.innerHTML = data
      .map(
        (d) => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${d.Company}</strong> - ${d.Role} (${d.Date})
        </div>
        <div>
          <button class="btn btn-sm btn-secondary downloadEligibilityBtn" data-driveid="${d.DriveID}">Download Eligibility</button>
        </div>
      </li>
    `
      )
      .join("");

    // Add click events for download buttons
    document.querySelectorAll(".downloadEligibilityBtn").forEach((btn) => {
      btn.addEventListener("click", () =>
        downloadEligibility(btn.dataset.driveid)
      );
    });
  } catch (err) {
    driveList.innerHTML = `<li class='list-group-item text-danger text-center'>Error: ${err.message}</li>`;
  }
}

// Download eligibility CSV for a specific drive
async function downloadEligibility(driveID) {
  if (!driveID) return alert("Drive ID missing");

  try {
    const response = await fetch(
      `${APPS_SCRIPT_URL}?action=downloadEligibility&driveID=${driveID}`
    );
    if (!response.ok) throw new Error("Failed to fetch eligibility data");

    const csv = await response.text();
    if (!csv || csv.trim() === "")
      return alert("No eligibility data found for this Drive ID");

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Eligibility_${driveID}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    alert("Error downloading eligibility: " + err.message);
  }
}

// Refresh button
refreshDrivesBtn.addEventListener("click", loadAllDrives);

// Load drives on page ready
loadAllDrives();

/* ===== Initial ===== */
showView(viewLogin);
