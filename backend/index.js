import express from "express";
import multer from "multer";
import cors from "cors";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/compliance-check", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const parsed = await pdfParse(req.file.buffer);

    res.json({
      extractedText: parsed.text.slice(0, 5000),
      pageCount: parsed.numpages,
      info: parsed.info || {},
    });
  } catch (err) {
    console.error("PDF parsing error:", err);
    res.status(500).json({ error: "PDF parsing failed" });
  }
});

app.listen(4000, () => {
  console.log("✅ Compliance service running on http://localhost:4000");
});
