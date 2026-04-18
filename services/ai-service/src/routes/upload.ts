import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Configure storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    // Ensure the directly exists just in case
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Prevent name collisions by adding Date
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.post("/", upload.single('image'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No file uploaded" });
    return;
  }

  // Construct the public URL for the newly uploaded file based on host
  const protocol = req.protocol;
  const host = req.get('host');
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

  res.status(200).json({
    success: true,
    fileUrl: fileUrl,
    filename: req.file.filename
  });
});

export const uploadRouter = router;
