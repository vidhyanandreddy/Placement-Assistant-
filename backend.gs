/* ===== Backend for Placement Assistant ===== */

const SPREADSHEET_ID = '1TeM1bS10uYm__gshJ_-6tjuf1QkcFi5bNjnrLCfqpqc';
const SHEET_NAME = 'Sheet1';
const FOLDER_ID = '1UdAJMB4-yRdA2ITQ396QGaJVWc8hNzrU';
const SECRET_TOKEN = '123';
const DRIVES_SHEET_NAME = 'Drive';
const ELIGIBILITY_SHEET_NAME = 'Eligibility';

/* ===== Web App Entrypoints ===== */
function doGet(e) {
  try {
    const action = (e.parameter.action || '').trim();

    if (action === 'test') return json({ status: 'success' });

    if (action === 'getStudent') {
      const roll = String(e.parameter.roll || '').trim();
      if (!roll) return json({ error: 'missing roll' });
      const student = getStudentByRoll(roll);

    // ✅ Add resume status (normalized)
student.resumeStatus =(String(student.Uploaded || '').trim().toLowerCase() === 'yes') ? 'Uploaded' : 'Not Uploaded';

      return json(student || { error: 'not found' });
    }

    if (action === 'getAll') return json(getAllStudents());

    if (action === 'getByYear') {
      const year = String(e.parameter.year || '').trim();
      if (!year) return json({ error: 'missing year' });
      const students = getAllStudents().filter(s => String(s.AdmittedYear || '') === year);
      return json(students);
    }

    if (action === 'verifyLogin') {
      const roll = String(e.parameter.roll || '').trim();
      const branch = String(e.parameter.branch || '').trim();
      if (!roll || !branch) return json({ success: false, error: 'missing fields' });
      const student = getStudentByRoll(roll);
      if (!student) return json({ success: false, error: 'roll not found' });
      return json({ success: student.Branch.trim().toLowerCase() === branch.toLowerCase(), student });
    }
    // ========= REPLACED downloadEligibility =========
if (e.parameter.action === "downloadEligibility") {
  const driveID = String(e.parameter.driveID || "").trim();
  if (!driveID) return ContentService.createTextOutput("missing driveID");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(ELIGIBILITY_SHEET_NAME) || ss.insertSheet(ELIGIBILITY_SHEET_NAME);

  let data = sheet.getDataRange().getValues();
  const headers = data.length ? data[0].map(h => String(h || '').trim()) : [];
  let filtered = data.length > 1 ? data.slice(1).filter(r => String(r[0] || '').trim() === driveID) : [];

  // If no eligibility data exists, generate it
  if (filtered.length === 0) {
    try {
      prepareEligibilityForDrive(driveID);
      data = sheet.getDataRange().getValues();
      filtered = data.slice(1).filter(r => String(r[0] || '').trim() === driveID);
    } catch (err) {
      return ContentService.createTextOutput("Error preparing eligibility: " + err.toString());
    }
  }

  if (filtered.length === 0) return ContentService.createTextOutput("No data found for this Drive ID");

  // Build CSV with proper escaping
  const escapeCell = (v) => {
    if (v === null || v === undefined) return '""';
    const s = String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  };

  const csvRows = [];
  csvRows.push(headers.map(escapeCell).join(','));
  for (const row of filtered) {
    csvRows.push(row.map(escapeCell).join(','));
  }

  const csv = csvRows.join('\n');
  return ContentService
    .createTextOutput(csv)
    .setMimeType(ContentService.MimeType.CSV);
}
// =================================================

if (action === 'getAllDrives') {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(DRIVES_SHEET_NAME) || ss.insertSheet(DRIVES_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return json([]);
  const headers = data[0];
  const drives = data.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = r[i]);
    return obj;
  });
  return json(drives);
}


    return json({ error: 'invalid action' });
  } catch (err) {
    return json({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = (body.action || '').trim();

    // Unauthorized check
    if ((action === 'uploadResume' || action === 'updateDetails') && body.secret !== SECRET_TOKEN) {
      return json({ error: 'unauthorized' });
    }

    if (action === 'uploadResume') {
      const roll = String(body.roll || '').trim();
      const fileName = body.fileName || (roll + '_resume.pdf');
      const mimeType = body.mimeType || 'application/pdf';
      const base64 = body.base64 || '';
      if (!roll || !base64) return json({ error: 'missing fields' });

      const bytes = Utilities.base64Decode(base64);
      const blob = Utilities.newBlob(bytes, mimeType, fileName);
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const url = file.getUrl();

      const ok = updateStudentOnUpload(
        roll,
        url,
        body.email,
        body.phone,
        body.dob,
        body.cgpa,
        body.admittedYear,
        body.graduationYear,
        body.institute,
        body.backlogs,
        body.linkedin
      );

      return json({ success: ok, url });
    }

    if (action === 'updateDetails') {
      const ok = updateStudentDetails(
        body.roll,
        body.email,
        body.phone,
        body.dob,
        body.cgpa,
        body.admittedYear,
        body.graduationYear,
        body.institute,
        body.backlogs,
        body.linkedin
      );
      return json({ success: ok });
    }

    if (action === 'verifyLogin') {
      const roll = String(body.roll || '').trim();
      const admittedYear = String(body.admittedYear || '').trim();
      if (!roll || !admittedYear) return json({ success: false, error: 'missing fields' });

      const student = getStudentByRoll(roll);
      if (!student) return json({ success: false, error: 'roll not found' });

      return json({ success: String(student.AdmittedYear) === admittedYear, student });
    }

    if (action === "addDrive") {
      const result = addDrive(body);
      return json(result);
    }
    // ===== Delete Drive =====
if (action === "deleteDrive") {
  if (body.secret !== SECRET_TOKEN) return json({ error: "unauthorized" });

  const driveID = String(body.driveID || "").trim();
  if (!driveID) return json({ success: false, message: "Missing drive ID" });

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(DRIVES_SHEET_NAME);
    if (!sheet) return json({ success: false, message: "Drives sheet not found" });

    const data = sheet.getDataRange().getValues();
    let deleted = false;

    // Loop through rows (skip header)
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === driveID) {
        sheet.deleteRow(i + 1);
        deleted = true;
        break;
      }
    }

    if (deleted) {
      return json({ success: true, message: "Drive deleted successfully" });
    } else {
      return json({ success: false, message: "Drive ID not found" });
    }
  } catch (err) {
    return json({ success: false, error: err.toString() });
  }
}

     if (action === "prepareEligibilityForDrive") {
  if (body.secret !== SECRET_TOKEN) return json({ error: 'unauthorized' });

  const driveID = String(body.driveID || '').trim();
  if (!driveID) return json({ error: 'missing driveID' });

  try {
    prepareEligibilityForDrive(driveID); // call the function here
    return json({ success: true, driveID });
  } catch (err) {
    return json({ error: err.toString() });
  }
}
    return json({ error: 'invalid action' });

  } catch (err) {
    return json({ error: err.toString() });
  }
}



/* ===== Sheet Helpers ===== */
function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet not found');
  return sheet;
}

function getAllStudents() {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows.shift();
  return rows.map((r, i) => {
    const obj = {};
    headers.forEach((h, j) => obj[h.trim()] = r[j]);
    obj._row = i + 2;
    return obj;
  });
}

function getStudentByRoll(roll) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => h.trim());
  const rollCol = headers.indexOf('RollNo');
  if (rollCol < 0) throw new Error('RollNo column not found');
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][rollCol]).trim() === roll) {
      const obj = {};
      headers.forEach((h, j) => obj[h] = rows[i][j]);
      obj._row = i + 1;
      return obj;
    }
  }
  return null;
}

function updateStudentOnUpload(roll, url, email, phone, dob, cgpa, admittedYear, graduationYear, institute, backlogs, linkedin) {
  const ok = updateStudentDetails(
    roll,
    email,
    phone,
    dob,
    cgpa,
    admittedYear,
    graduationYear,
    institute,
    backlogs,
    linkedin
  );
  const sheet = getSheet();
  const headers = sheet.getDataRange().getValues()[0].map(h => h.trim());
  const rollCol = headers.indexOf('RollNo');
  const resumeCol = headers.indexOf('ResumeLink');
  const uploadedCol = headers.indexOf('Uploaded');

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][rollCol]).trim() === roll) {
      if (resumeCol >= 0) sheet.getRange(i + 1, resumeCol + 1).setValue(url);
      if (uploadedCol >= 0) sheet.getRange(i + 1, uploadedCol + 1).setValue('Yes');
      return true;
    }
  }
  return false;
}

function updateStudentDetails(roll, email, phone, dob, cgpa, admittedYear, graduationYear, institute, backlogs, linkedin) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => h.trim());
  const getCol = name => headers.indexOf(name);
  const rollCol = getCol('RollNo');

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][rollCol]).trim() === roll) {
      if (getCol('DOB') >= 0) sheet.getRange(i + 1, getCol('DOB') + 1).setValue(dob || '');
      if (getCol('CGPA') >= 0) sheet.getRange(i + 1, getCol('CGPA') + 1).setValue(cgpa || '');
      if (getCol('Email') >= 0) sheet.getRange(i + 1, getCol('Email') + 1).setValue(email || '');
      if (getCol('Phone') >= 0) sheet.getRange(i + 1, getCol('Phone') + 1).setValue(phone || '');
      if (getCol('AdmittedYear') >= 0) sheet.getRange(i + 1, getCol('AdmittedYear') + 1).setValue(admittedYear || '');
      if (getCol('GraduationYear') >= 0) sheet.getRange(i + 1, getCol('GraduationYear') + 1).setValue(graduationYear || '');
      if (getCol('InstituteName') >= 0) sheet.getRange(i + 1, getCol('InstituteName') + 1).setValue(institute || '');
      if (getCol('ActiveBacklogs') >= 0) sheet.getRange(i + 1, getCol('ActiveBacklogs') + 1).setValue(Number(backlogs) || 0);
      if (getCol('LinkedIn') >= 0) sheet.getRange(i + 1, getCol('LinkedIn') + 1).setValue(linkedin || '');
      return true;
    }
  }
  return false;
}

/* ===== Drives & Eligibility ===== */
function addDrive(body) {
  if (body.secret !== SECRET_TOKEN) return { error: "unauthorized" };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const drivesSheet = ss.getSheetByName(DRIVES_SHEET_NAME) || ss.insertSheet(DRIVES_SHEET_NAME);

  if (drivesSheet.getLastRow() === 0) {
    drivesSheet.appendRow([
      "DriveID", "Company", "Role", "Date", "Min CGPA",
      "Branches", "Max Backlogs", "Graduation Year", "Package"
    ]);
  }

  const driveID = "D" + new Date().getTime();
  drivesSheet.appendRow([
    driveID,
    body.company,
    body.role,
    body.date,
    body.minCGPA,
    body.branches,
    body.maxBacklogs,
    body.gradYears,
    body.package
  ]);

  return { success: true, driveID };
}

function prepareEligibilityForDrive(driveID) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const drivesSheet = ss.getSheetByName(DRIVES_SHEET_NAME);
  const studentsSheet = ss.getSheetByName(SHEET_NAME);
  const eligibilitySheet =
    ss.getSheetByName(ELIGIBILITY_SHEET_NAME) || ss.insertSheet(ELIGIBILITY_SHEET_NAME);

  // Ensure headers
  if (eligibilitySheet.getLastRow() === 0) {
    eligibilitySheet.appendRow([
      "DriveID", "Company", "RollNo", "Name", "Branch", "CGPA",
      "Email", "Phone", "GraduationYear", "ActiveBacklogs",
      "ResumeLink", "LinkedIn"
    ]);
  }

  const drives = drivesSheet.getDataRange().getValues().slice(1);
  const drive = drives.find(d => String(d[0] || '').trim() === driveID);
  if (!drive) throw new Error("Drive not found");

  const [, company, role, date, minCGPA, branches, maxBacklogs, gradYears] = drive;

  // Ensure proper string arrays and remove empty entries
  const allowedBranches = (branches || "")
    .toString()
    .split(",")
    .map(b => b.toString().trim().toLowerCase())
    .filter(b => b);

  const allowedGradYears = (gradYears || "")
    .toString()
    .split(",")
    .map(y => y.toString().trim())
    .filter(y => y);

  const students = studentsSheet.getDataRange().getValues();
  const headers = students[0].map(h => h.trim());
  const studentRows = students.slice(1);

  // Clear previous rows for this drive
  const eligRows = eligibilitySheet.getDataRange().getValues();
  for (let i = eligRows.length - 1; i >= 1; i--) {
    if (String(eligRows[i][0] || '').trim() === driveID) {
      eligibilitySheet.deleteRow(i + 1);
    }
  }

  const newRows = [];
  for (let student of studentRows) {
    const obj = {};
    headers.forEach((h, i) => obj[h] = student[i]);

    const studentBranch = (obj.Branch || '').toString().trim().toLowerCase();
    const studentGrad = (obj.GraduationYear || '').toString().trim();
    const cgpaOk = parseFloat(obj.CGPA || 0) >= parseFloat(minCGPA || 0);
    const backlogsOk = parseInt(obj.ActiveBacklogs || 0) <= parseInt(maxBacklogs || 0);
    const branchOk = allowedBranches.length === 0 || allowedBranches.includes(studentBranch);
    const gradOk = allowedGradYears.length === 0 || allowedGradYears.includes(studentGrad);

    // Debug logging for each student
    Logger.log(
      "Student: " + obj.RollNo +
      " | CGPA OK: " + cgpaOk +
      " | Backlogs OK: " + backlogsOk +
      " | Branch OK: " + branchOk +
      " | GradYear OK: " + gradOk
    );

    if (cgpaOk && backlogsOk && branchOk && gradOk) {
      newRows.push([
        driveID, company, obj.RollNo, obj.Name, obj.Branch, obj.CGPA,
        obj.Email, obj.Phone, obj.GraduationYear, obj.ActiveBacklogs,
        obj.ResumeLink || '', obj.LinkedIn || ''
      ]);
    }
  }

  if (newRows.length > 0) {
    eligibilitySheet.getRange(
      eligibilitySheet.getLastRow() + 1, 1, newRows.length, newRows[0].length
    ).setValues(newRows);
  }
}

/* ===== Utility ===== */
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}