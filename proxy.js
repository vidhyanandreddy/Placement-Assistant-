// filepath: c:\Users\Bhanu prakash\OneDrive\Desktop\placement_assistant_with_dob\proxy.js
const express = require("express");
const cors = require("cors");
const archiver = require("archiver");
const axios = require("axios");
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increase limit to 10MB

// GET handler for /api
app.get("/api", async (req, res) => {
  const fetch = (await import("node-fetch")).default;
  const params = new URLSearchParams(req.query).toString();
  const url =
    "https://script.google.com/macros/s/AKfycbw417bk3gBzKyvzfy-mL9jhg9G5HidtUILYwEq0y5JNYy7NirMpWymcGRJQrMMWRMX3rw/exec" +
    (params ? `?${params}` : "");
  const response = await fetch(url, { method: "GET" });
  const data = await response.text();
  res.type("json").send(data);
});

// POST handler for /api
app.post("/api", async (req, res) => {
  const fetch = (await import("node-fetch")).default;
  const response = await fetch(
    "https://script.google.com/macros/s/AKfycbw417bk3gBzKyvzfy-mL9jhg9G5HidtUILYwEq0y5JNYy7NirMpWymcGRJQrMMWRMX3rw/exec",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    }
  );
  const data = await response.text();
  res.type("json").send(data);
});


// Download resumes as zip
app.post("/download-resumes", async (req, res) => {
  try {
    const resumes = req.body.resumes;
    if (!resumes || !resumes.length) return res.status(400).json({ error: "No resumes" });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=resumes.zip");

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    function getDirectLink(url) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
      return url;
    }

    for (const s of resumes) {
      try {
        const url = getDirectLink(s.link);
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const filename = (s.name || "Unknown").replace(/[/\\?%*:|"<>]/g, "_") + ".pdf";
        archive.append(response.data, { name: filename });
      } catch (err) {
        console.error(`Failed to fetch ${s.name}:`, err.message || err);
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error("Error in /download-resumes:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.listen(4000, () => console.log("Proxy running on http://localhost:4000"));
