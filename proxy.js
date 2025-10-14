// filepath: c:\Users\Bhanu prakash\OneDrive\Desktop\placement_assistant_with_dob\proxy.js
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increase limit to 10MB

// GET handler for /api
app.get("/api", async (req, res) => {
  const fetch = (await import("node-fetch")).default;
  const params = new URLSearchParams(req.query).toString();
  const url =
    "https://script.google.com/macros/s/AKfycbxdC2AnIOibHHVuhmgUIT2O9PtlIRHrAtEIGSUD80vyVA790dai5KAQL4ksARI9gPt-7w/exec" +
    (params ? `?${params}` : "");
  const response = await fetch(url, { method: "GET" });
  const data = await response.text();
  res.type("json").send(data);
});

// POST handler for /api
app.post("/api", async (req, res) => {
  const fetch = (await import("node-fetch")).default;
  const response = await fetch(
    "https://script.google.com/macros/s/AKfycbxdC2AnIOibHHVuhmgUIT2O9PtlIRHrAtEIGSUD80vyVA790dai5KAQL4ksARI9gPt-7w/exec",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    }
  );
  const data = await response.text();
  res.type("json").send(data);
});


app.listen(4000, () => console.log("Proxy running on http://localhost:4000"));
