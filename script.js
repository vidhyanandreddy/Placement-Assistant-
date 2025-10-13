/* ===== CONFIG ===== */
// const APPS_SCRIPT_URL ="https://script.google.com/macros/s/AKfycbyoyxFY5R_M2Gceh7TpEJotAIGyL-cLSjh3aS3lgW8H7xDHWJxfzeE08TuL5RWzfxU_Kw/exec";
const SECRET_TOKEN = "123"; // default token
const ADMIN_PASSWORD = "123"; // default admin password
const APPS_SCRIPT_URL = "http://localhost:4000/api";
/* ===== UI references ===== */
const loginForm = document.getElementById("loginForm");
const viewLogin = document.getElementById("view-login");
const viewUpload = document.getElementById("view-upload");
const viewAdmin = document.getElementById("view-admin");

const rollInput = document.getElementById("rollInput");
const branchInput = document.getElementById("branchInput");
const loginMessage = document.getElementById("loginMessage");
const dobInput = document.getElementById("dobInput");
const studentInfo = document.getElementById("studentInfo");
const emailInput = document.getElementById("emailInput");
const phoneInput = document.getElementById("phoneInput");
const cgpaInput = document.getElementById("cgpaInput");
const fileInput = document.getElementById("fileInput");
const uploadForm = document.getElementById("uploadForm");
const uploadMessage = document.getElementById("uploadMessage");
const btnLogout = document.getElementById("btn-logout");
const btnSaveDetails = document.getElementById("btn-save-details");

const uploadedList = document.getElementById("uploadedList");
const notUploadedList = document.getElementById("notUploadedList");
const adminSummary = document.getElementById("adminSummary");
const adminMessage = document.getElementById("adminMessage");

const navLogin = document.getElementById("nav-login");
const navAdmin = document.getElementById("nav-admin");
const btnRefreshAdmin = document.getElementById("btn-refresh-admin");
const btnBackToLogin = document.getElementById("btn-back-to-login");
const downloadUploaded = document.getElementById("downloadUploaded");
const downloadNotUploaded = document.getElementById("downloadNotUploaded");
const loginClear = document.getElementById("login-clear");

const adminPasswordInput = document.getElementById("adminPasswordInput");
const adminPasswordError = document.getElementById("adminPasswordError");
const confirmAdminLogin = document.getElementById("confirmAdminLogin");

let currentUser = null;

/* ===== Helper: show/hide views ===== */
// function showView(view) {
//   [viewLogin, viewUpload, viewAdmin].forEach((v) => v.classList.add("d-none"));
//   view.classList.remove("d-none");
// }
function showView(view) {
  [viewLogin, viewUpload, viewAdmin].forEach((v) => v.classList.add("d-none"));
  view.classList.remove("d-none");

  if (view === viewLogin) {
    rollInput.value = "";
    branchInput.value = "";
    loginMessage.innerHTML = "";
  }
}
/* ===== Navigation events ===== */
if (navLogin) navLogin.addEventListener("click", () => showView(viewLogin));

// Admin button opens modal only
if (navAdmin) {
  navAdmin.addEventListener("click", () => {
    const modalEl = document.getElementById("adminLoginModal");
    const modal = new bootstrap.Modal(modalEl);
    adminPasswordInput.value = "";
    adminPasswordError.classList.add("d-none");
    modal.show();
  });
}

// Confirm admin login
if (confirmAdminLogin) {
  confirmAdminLogin.addEventListener("click", () => {
    const password = adminPasswordInput.value.trim();
    if (password === ADMIN_PASSWORD) {
      const modalEl = document.getElementById("adminLoginModal");
      bootstrap.Modal.getInstance(modalEl).hide();
      loadAdmin();
      showView(viewAdmin);
    } else {
      adminPasswordError.classList.remove("d-none");
    }
  });
}

// Back to login
if (btnBackToLogin) {
  btnBackToLogin.addEventListener("click", () => showView(viewLogin));
}

// Refresh admin data
if (btnRefreshAdmin) btnRefreshAdmin.addEventListener("click", loadAdmin);

// Clear login form
if (loginClear) {
  loginClear.addEventListener("click", () => {
    rollInput.value = "";
    branchInput.value = "";
    loginMessage.innerHTML = "";
  });
}

/* ===== API functions ===== */
// async function apiGet(params = {}) {
//   const url = new URL(APPS_SCRIPT_URL);
//   Object.keys(params).forEach((k) => url.searchParams.append(k, params[k]));
//   const res = await fetch(url);
//   return res.json();
// }
async function apiGet(params = {}) {
  try {
    const url = new URL(APPS_SCRIPT_URL);
    Object.keys(params).forEach((k) => url.searchParams.append(k, params[k]));
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    console.error("apiGet error:", err);
    return { error: "Network error" };
  }
}

async function apiPost(action, payload = {}) {
  const body = JSON.stringify({ action, ...payload });
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return res.json();
}

/* ===== Login flow ===== */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const roll = (rollInput.value || "").trim();
  const branch = (branchInput.value || "").trim();
  loginMessage.innerHTML = "";
  if (!roll || !branch) {
    loginMessage.innerHTML = `<div class="text-danger">Please enter roll and branch</div>`;
    return;
  }
  loginMessage.innerHTML = `<div class="text-info">Verifying...</div>`;
  try {
    const res = await apiGet({
      action: "verifyLogin",
      roll,
      branch,
      secret: SECRET_TOKEN,
    });
    if (res?.success && res?.student) {
      currentUser = res.student;
      populateStudentForm(currentUser);
      showView(viewUpload);
      loginMessage.innerHTML = "";
    } else {
      loginMessage.innerHTML = `<div class="text-danger">Invalid roll number or branch</div>`;
      console.log("verifyLogin response:", res);
    }
  } catch (err) {
    console.error(err);
    loginMessage.innerHTML = `<div class="text-danger">Server error</div>`;
  }
});

function populateStudentForm(user) {
  studentInfo.innerHTML = `
    <div><strong>Roll:</strong> ${escapeHtml(
      user.RollNo || user.Roll || ""
    )}</div>
    <div><strong>Name:</strong> ${escapeHtml(user.Name || "")}</div>
    <div><strong>Branch:</strong> ${escapeHtml(user.Branch || "")}</div>
  `;
  emailInput.value = user.Email || "";
  phoneInput.value = user.Phone || "";
  dobInput.value = user.DOB || "";
  uploadMessage.innerHTML = "";
}

btnLogout.addEventListener("click", () => {
  currentUser = null;
  rollInput.value = "";
  branchInput.value = "";
  showView(viewLogin);
});

/* ===== Save student details ===== */
btnSaveDetails.addEventListener("click", async () => {
  if (!currentUser) return;
  const roll = currentUser.RollNo || currentUser.Roll;
  const email = (emailInput.value || "").trim();
  const phone = (phoneInput.value || "").trim();
  const dob = (dobInput.value || "").trim(); 
  const cgpa = (cgpaInput.value || "").trim(); 
  uploadMessage.innerHTML = `<div class="text-info">Saving details...</div>`;
  btnSaveDetails.disabled = true;
  try {
    const res = await apiPost("updateDetails", {
      secret: SECRET_TOKEN,
      roll,
      email,
      phone,
      dob,
      cgpa,
    });
    if (res?.success) {
      uploadMessage.innerHTML = `<div class="text-success">Details updated.</div>`;
    } else {
      uploadMessage.innerHTML = `<div class="text-danger">Update failed.</div>`;
      console.error(res);
    }
  } catch (err) {
    console.error(err);
    uploadMessage.innerHTML = `<div class="text-danger">Server error.</div>`;
  } finally {
    btnSaveDetails.disabled = false;
  }
});

/* ===== Upload flow ===== */
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const f = fileInput.files[0];
  const roll = currentUser.RollNo || currentUser.Roll;
  const email = (emailInput.value || "").trim();
  const phone = (phoneInput.value || "").trim();
  const dob = (dobInput.value || "").trim();
  const cgpa = (cgpaInput.value || "").trim();

  if (!f) {
    uploadMessage.innerHTML = `<div class="text-danger">Please choose a PDF file to upload.</div>`;
    return;
  }
  if (f.type !== "application/pdf") {
    uploadMessage.innerHTML = `<div class="text-danger">Only PDF files allowed.</div>`;
    return;
  }
  if (f.size > 6 * 1024 * 1024) {
    uploadMessage.innerHTML = `<div class="text-danger">File too large (max ~6MB).</div>`;
    return;
  }

  uploadMessage.innerHTML = `<div class="text-info">Preparing upload...</div>`;
  fileInput.disabled = true;
  btnSaveDetails.disabled = true;
  try {
    const { base64, mime } = await fileToBase64(f);
    uploadMessage.innerHTML = `<div class="text-info">Uploading...</div>`;
    const payload = {
      secret: SECRET_TOKEN,
      roll,
      fileName: `${roll}_resume_${Date.now()}.pdf`,
      mimeType: mime || "application/pdf",
      base64,
      email,
      phone,
      dob,
      cgpa,
    };
    const res = await apiPost("uploadResume", payload);
    if (res?.success) {
      uploadMessage.innerHTML = `<div class="text-success">Uploaded successfully. <a href="${res.url}" target="_blank">Open resume</a></div>`;
    } else {
      uploadMessage.innerHTML = `<div class="text-danger">Upload failed: ${escapeHtml(
        res?.error || "unknown"
      )}</div>`;
      console.error(res);
    }
  } catch (err) {
    console.error(err);
    uploadMessage.innerHTML = `<div class="text-danger">Upload error.</div>`;
  } finally {
    fileInput.disabled = false;
    btnSaveDetails.disabled = false;
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const parts = result.split(",");
      resolve({ base64: parts[1], mime: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ===== Admin: load all students ===== */
async function loadAdmin() {
  adminMessage.innerHTML = "";
  uploadedList.innerHTML = "";
  notUploadedList.innerHTML = "";
  adminSummary.innerHTML = "Loading...";
  try {
    const all = await apiGet({ action: "getAll" });
    if (!Array.isArray(all)) {
      adminSummary.innerHTML = `<div class="text-danger">Failed to load</div>`;
      return;
    }

    const uploaded = all.filter(
      (s) =>
        String(s.Uploaded || "")
          .trim()
          .toLowerCase() === "yes" ||
        (s.ResumeLink && String(s.ResumeLink).length > 5)
    );
    const notUploaded = all.filter((s) => !uploaded.includes(s));

    adminSummary.innerHTML = `
      <div class="row">
        <div class="col-sm-4">Total: <strong>${all.length}</strong></div>
        <div class="col-sm-4">Uploaded: <strong>${uploaded.length}</strong></div>
        <div class="col-sm-4">Not uploaded: <strong>${notUploaded.length}</strong></div>
      </div>
    `;

    uploadedList.innerHTML = uploaded.length
      ? uploaded
          .map(
            (s) => `
        <li class="list-group-item d-flex justify-content-between align-items-start">
          <div>
            <div><strong>${escapeHtml(s.RollNo)}</strong> — ${escapeHtml(
              s.Name || ""
            )}</div>
            <div class="small">${escapeHtml(s.Email || "")} ${escapeHtml(
              s.Phone || ""
            )}</div>

        <div><strong>${escapeHtml(s.RollNo)}</strong> — ${escapeHtml(
              s.Name || ""
            )}</div>
        <div class="small">
          ${escapeHtml(s.Email || "")} ${escapeHtml(s.Phone || "")}<br>
          DOB: ${escapeHtml(s.DOB || "N/A")} | CGPA: ${escapeHtml(
              s.CGPA || "N/A"
            )}
        </div>
      </div>
      <div><a href="${
        s.ResumeLink
      }" target="_blank" class="btn btn-sm btn-outline-primary">Open</a></div>
    </li>
      `
          )
          .join("")
      : `<li class="list-group-item">No uploads yet</li>`;

    notUploadedList.innerHTML = notUploaded.length
      ? notUploaded
          .map(
            (s) =>
              `<li class="list-group-item"><strong>${escapeHtml(
                s.RollNo
              )}</strong> — ${escapeHtml(s.Name || "")}</li>`
          )
          .join("")
      : `<li class="list-group-item">All students uploaded</li>`;

    downloadUploaded.onclick = () => downloadCSV(uploaded, "uploaded.csv");
    downloadNotUploaded.onclick = () =>
      downloadCSV(notUploaded, "not_uploaded.csv");
  } catch (err) {
    console.error(err);
    adminSummary.innerHTML = `<div class="text-danger">Server error</div>`;
  }
}

function updateStudentDetails(roll, email, phone, dob, cgpa) {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Students");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === roll) {
      sheet.getRange(i + 1, 3).setValue(dob); // Column 3: DOB
      sheet.getRange(i + 1, 5).setValue(cgpa); // Column 5: CGPA
      sheet.getRange(i + 1, 6).setValue(email);
      sheet.getRange(i + 1, 7).setValue(phone);
      return true;
    }
  }
  return false;
}


/* ===== CSV helper ===== */
function downloadCSV(rows, filename = "report.csv") {
  if (!rows?.length) {
    alert("No rows to download");
    return;
  }
  // const headers = Object.keys(rows[0]).filter((k) => k !== "_row");
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
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const finalName = `${filename.replace(".csv", "")}_${timestamp}.csv`;
  link.setAttribute("download", finalName);
  
}

/* ===== Utility ===== */
// function escapeHtml(str) {
//   if (!str && str !== 0) return "";
//   return String(str)
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&#039;");
// }
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

async function loadPlacementStats() {
  try {
    const res = await apiGet({ action: "getStats" }); 
    document.getElementById("companiesHired").textContent = res.companies || 24;
    document.getElementById("studentsPlaced").textContent = res.students || 369;
  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}

// Call this after page load or after login
loadPlacementStats();

/* ===== Show login on load ===== */
showView(viewLogin);


