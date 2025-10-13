Placement Assistant — ZIP package with DOB verification

Files included:
- index.html        (frontend)
- styles.css        (frontend CSS)
- script.js         (frontend JS — configure APPS_SCRIPT_URL and SECRET_TOKEN)
- backend.gs        (Google Apps Script backend — paste into Apps Script editor)
- README.txt        (this file)

Setup steps (short):
1. Create Google Sheet with header row exactly:
   RollNo,Name,Branch,CGPA,DOB,Email,Phone,ResumeLink,Uploaded
   (DOB can be in DD-MM-YYYY or other formats; backend normalizes common formats)

2. Create Google Drive folder for resumes and copy FOLDER_ID from URL.

3. Open Google Sheet -> Extensions -> Apps Script -> create new project.
   - Paste content of backend.gs
   - Replace SPREADSHEET_ID, FOLDER_ID, SECRET_TOKEN constants.
   - Save and Deploy -> New deployment -> Web app
     * Execute as: Me
     * Who has access: Anyone
   - Copy Web App URL.

4. Edit script.js:
   - Set APPS_SCRIPT_URL = 'YOUR_WEB_APP_URL'
   - Set SECRET_TOKEN = 'THE_SAME_SECRET'

5. Host frontend:
   - You can open index.html locally to test
   - For public access, deploy folder to Netlify (drag & drop) or GitHub Pages.

Notes:
- Login flow uses roll number + DOB verification via POST verifyLogin (DOB is sent to Apps Script).
- SECRET_TOKEN is present client-side; for improved security, use serverless functions to hide it.
- Drive files are set to 'Anyone with link can view'.
