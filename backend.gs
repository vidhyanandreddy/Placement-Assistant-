/* Backend for Placement Assistant (Robust Version)
   - Login via RollNo + Branch
   - getAll, getStudent, uploadResume, updateDetails, test
*/

const SPREADSHEET_ID = '1TeM1bS10uYm__gshJ_-6tjuf1QkcFi5bNjnrLCfqpqc';
const SHEET_NAME = 'Sheet1';
const FOLDER_ID = '1UdAJMB4-yRdA2ITQ396QGaJVWc8hNzrU';
const SECRET_TOKEN = '123';


// ---------------- Web App Entrypoints ----------------
function doGet(e) {
  try {
    if (!e) {
      Logger.log('doGet called manually. No parameters available.');
      return json({ error: "Event parameter missing (manual run?)" });
    }

    Logger.log('doGet params: %s', JSON.stringify(e.parameter));

    const action = (e.parameter.action || '').trim();

    if (action === 'test') {
      return json({ status: 'success'});  //, sheet: testSheet(), folder: testFolder() 
    }
    if (action === 'getStudent') {
      const roll = String(e.parameter.roll || '').trim();
      if (!roll) return json({ error: 'missing roll' });
      const student = getStudentByRoll(roll);
      if (!student) return json({ error: 'not found' });
      return json(student);
    }
    if (action === 'getAll') {
      return json(getAllStudents());
    }

    // Add GET login support
    if (action === 'verifyLogin') {
      const roll = String(e.parameter.roll || '').trim();
      const branch = String(e.parameter.branch || '').trim();
      if (!roll || !branch) return json({ success: false, error: 'missing fields' });

      const student = getStudentByRoll(roll);
      if (!student) return json({ success: false, error: 'roll not found' });

      const sheetBranch = String(student.Branch || '').trim().toLowerCase();
      if (sheetBranch === branch.toLowerCase()) {
        return json({ success: true, student });
      } else {
        return json({ success: false, error: 'branch mismatch' });
      }
    }

    return json({ error: 'invalid action' });
  } catch (err) {
    Logger.log('doGet error: %s', err);
    return json({ error: err.toString() });
  }
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    Logger.log('doPost body: %s', e.postData ? e.postData.contents : 'empty');
    if (!e) return json({ error: "Event parameter missing" });

    const body = JSON.parse(e.postData.contents || '{}');
    const action = (body.action || '').trim();

    // Protect only sensitive operations
    if ((action === 'uploadResume' || action === 'updateDetails') && body.secret !== SECRET_TOKEN) {
      return json({ error: 'unauthorized' });
    }

    // ----- LOGIN via RollNo + Branch -----
    if (action === 'verifyLogin') {
      const roll = String(body.roll || '').trim();
      const branch = String(body.branch || '').trim();
      if (!roll || !branch) return json({ success: false, error: 'missing fields' });

      const student = getStudentByRoll(roll);
      if (!student) return json({ success: false, error: 'roll not found' });

      const sheetBranch = String(student.Branch || '').trim().toLowerCase();
      if (sheetBranch === branch.toLowerCase()) {
        return json({ success: true, student });
      } else {
        return json({ success: false, error: 'branch mismatch' });
      }
    }

    // ----- UPLOAD RESUME -----
    if (action === 'uploadResume') {
      const roll = String(body.roll || '').trim();
      const fileName = body.fileName || (roll + '_resume.pdf');
      const mimeType = body.mimeType || 'application/pdf';
      const base64 = body.base64 || '';
      const email = body.email || '';
      const phone = body.phone || '';

      if (!roll || !base64) return json({ error: 'missing fields' });

      const bytes = Utilities.base64Decode(base64);
      const blob = Utilities.newBlob(bytes, mimeType, fileName);

      const folder = DriveApp.getFolderById(FOLDER_ID);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const url = file.getUrl();

      const ok = updateStudentOnUpload(roll, url, email, phone);
      return json({ success: ok, url });
    }

    // ----- UPDATE DETAILS -----

  if (action === 'updateDetails') {
  const roll = String(body.roll || '').trim();
  const email = body.email || '';
  const phone = body.phone || '';
  const dob = body.dob || '';
  const cgpa = body.cgpa || '';

  if (!roll) return json({ error: 'missing roll' });

  const ok = updateStudentDetails(roll, email, phone, dob, cgpa);
  return json({ success: ok });
}
    return json({ error: 'invalid action' });

  } catch (err) {
    Logger.log('doPost error: %s', err);
    return json({ error: err.toString() });
  }
}

// ---------------- Helper functions ----------------
function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet not found: ' + SHEET_NAME);
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
  const branchCol = headers.indexOf('Branch');

  if (rollCol < 0) throw new Error('RollNo column not found');
  if (branchCol < 0) throw new Error('Branch column not found');

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

function updateStudentOnUpload(roll, url, email, phone, dob, cgpa) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => h.trim());

  const rollCol = headers.indexOf('RollNo');
  const resumeCol = headers.indexOf('ResumeLink');
  const uploadedCol = headers.indexOf('Uploaded');
  const emailCol = headers.indexOf('Email');
  const phoneCol = headers.indexOf('Phone');
  const dobCol = headers.indexOf('DOB');
  const cgpaCol = headers.indexOf('CGPA');

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][rollCol]).trim() === roll) {
      if (resumeCol >= 0) sheet.getRange(i + 1, resumeCol + 1).setValue(url);
      if (uploadedCol >= 0) sheet.getRange(i + 1, uploadedCol + 1).setValue('Yes');
      if (emailCol >= 0 && email) sheet.getRange(i + 1, emailCol + 1).setValue(email);
      if (phoneCol >= 0 && phone) sheet.getRange(i + 1, phoneCol + 1).setValue(phone);
      if (dobCol >= 0 && dob) sheet.getRange(i + 1, dobCol + 1).setValue(dob);
      if (cgpaCol >= 0 && cgpa) sheet.getRange(i + 1, cgpaCol + 1).setValue(cgpa);
      return true;
    }
  }
  return false;
}

function updateStudentDetails(roll, email, phone, dob, cgpa) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => h.trim());

  const rollCol = headers.indexOf('RollNo');
  const emailCol = headers.indexOf('Email');
  const phoneCol = headers.indexOf('Phone');
  const dobCol = headers.indexOf('DOB');
  const cgpaCol = headers.indexOf('CGPA');

  if (rollCol < 0) throw new Error('RollNo column not found');

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][rollCol]).trim() === roll.trim()) {
      if (dobCol >= 0) sheet.getRange(i + 1, dobCol + 1).setValue(dob || '');
      if (cgpaCol >= 0) sheet.getRange(i + 1, cgpaCol + 1).setValue(cgpa || '');
      if (emailCol >= 0) sheet.getRange(i + 1, emailCol + 1).setValue(email || '');
      if (phoneCol >= 0) sheet.getRange(i + 1, phoneCol + 1).setValue(phone || '');
      return true;
    }
  }
  return false;
}

// ---------------- Utilities ----------------
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------- Test functions ----------------
function testSheet() {
  try {
    const sheet = getSheet();
    return { ok: true, name: sheet.getName() };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

function testFolder() {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    return { ok: true, name: folder.getName() };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}
