export const MAX_PDF_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const PDF_ACCEPT_ATTRIBUTE = 'application/pdf,.pdf';
export const PDF_ERROR_NOT_PDF = 'Only PDF files are allowed.';
export const PDF_ERROR_TOO_LARGE = 'PDF file must not exceed 50 MB.';
export const PDF_ERROR_EMPTY = 'Uploaded file cannot be empty.';

export const isPdfFileName = (fileName?: string | null): boolean => {
  if (!fileName) return false;
  return fileName.trim().toLowerCase().endsWith('.pdf');
};

export const isPdfFile = (file?: File | null): boolean => {
  if (!file) return false;
  const hasPdfExt = isPdfFileName(file.name);
  const isPdfMime = file.type === 'application/pdf' || file.type === 'application/x-pdf';
  if (file.type) {
    return isPdfMime || hasPdfExt;
  }
  return hasPdfExt;
};

export const validatePdfUpload = (file?: File | null): string | null => {
  if (!file) {
    return 'Please select a file.';
  }
  if (!isPdfFile(file)) {
    return PDF_ERROR_NOT_PDF;
  }
  if (file.size === 0) {
    return PDF_ERROR_EMPTY;
  }
  if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
    return PDF_ERROR_TOO_LARGE;
  }
  return null;
};
