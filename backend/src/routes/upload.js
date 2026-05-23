import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticate } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = (() => {
  const candidates = [
    path.join(process.cwd(), "backend", "uploads"),
    path.join(__dirname, "../../uploads"),
    path.join(__dirname, "../uploads"),
  ];
  for (const p of candidates) {
    try { fs.mkdirSync(p, { recursive: true }); return p; } catch {}
  }
  return candidates[0];
})();
console.log("Uploads stored at:", UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|txt|zip|rar|mp4|mov|avi|mp3|wav)$/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error("File type not allowed"));
  },
});

const router = Router();

router.post("/", authenticate, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname,
      type: req.file.mimetype,
    });
  });
});

export default router;
