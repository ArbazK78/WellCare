const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const profileDirectory = path.join(uploadsRoot, 'guide-profiles');
const governmentIdDirectory = path.join(uploadsRoot, 'guide-government-ids');

const ensureDirectory = (directory) => {
  fs.mkdirSync(directory, { recursive: true });
  return directory;
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const directory = file.fieldname === 'government_id'
      ? governmentIdDirectory
      : profileDirectory;
    callback(null, ensureDirectory(directory));
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`);
  },
});

const allowedTypes = {
  profile_picture: new Set(['image/jpeg', 'image/png']),
  government_id: new Set(['image/jpeg', 'image/png', 'application/pdf']),
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 2,
    fields: 20,
  },
  fileFilter: (req, file, callback) => {
    const allowed = allowedTypes[file.fieldname];
    if (!allowed || !allowed.has(file.mimetype)) {
      return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
    callback(null, true);
  },
});

const uploadGuideDocuments = upload.fields([
  { name: 'profile_picture', maxCount: 1 },
  { name: 'government_id', maxCount: 1 },
]);

const handleGuideDocumentUpload = (req, res, next) => {
  uploadGuideDocuments(req, res, (error) => {
    if (!error) return next();

    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Each uploaded file must be 5 MB or smaller.'
      : 'Upload only a JPEG/PNG profile photo and a JPEG/PNG/PDF government ID.';
    return res.status(400).json({ message });
  });
};

module.exports = {
  governmentIdDirectory,
  handleGuideDocumentUpload,
  profileDirectory,
};
