import multer from 'multer';

const storage = multer.memoryStorage();

const getFileExtension = (fileName = '') => {
  const normalizedName = String(fileName).trim().toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf('.');

  if (lastDotIndex === -1) {
    return '';
  }

  return normalizedName.slice(lastDotIndex);
};

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/csv',
    'text/plain'
  ];

  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const ext = getFileExtension(file.originalname);

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
    return;
  }

  cb(new Error('Only CSV and Excel files are allowed (.csv, .xlsx, .xls)'), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024
  }
});
