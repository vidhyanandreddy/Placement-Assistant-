/* ===== Backend for Placement Assistant ===== */

const SPREADSHEET_ID = '1TeM1bS10uYm__gshJ_-6tjuf1QkcFi5bNjnrLCfqpqc';
const SHEET_NAME = 'Sheet1';
const FOLDER_ID = '1UdAJMB4-yRdA2ITQ396QGaJVWc8hNzrU';
const SECRET_TOKEN = '123';

/* ===== Web App Entrypoints ===== */
function doGet(e) {
  try {
    const action = (e.parameter.action || '').trim();

    if (action === 'test') return json({ status: 'success' });
    if (action === 'getStudent') {
      const roll = String(e.parameter.roll || '').trim();
      if (!roll) return json({ error: 'missing roll' });
      const student = getStudentByRoll(roll);
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

    return json({ error: 'invalid action' });
  } catch (err) { return json({ error: err.toString() }); }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = (body.action || '').trim();

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

  // Check admitted year instead of branch
  return json({ success: String(student.AdmittedYear) === admittedYear, student });
}


    return json({ error: 'invalid action' });
  } catch (err) { return json({ error: err.toString() }); }
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
  const ok = updateStudentDetails(roll, email, phone, dob, cgpa, admittedYear, graduationYear, institute, backlogs, linkedin);
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

/* ===== Utility ===== */
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
