/**
 * extractText.js
 * Utilities for extracting raw text from uploaded PDF and DOCX resume files.
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

/**
 * Extract text from a file buffer based on its MIME type / extension.
 * @param {Buffer} buffer  - File buffer
 * @param {string} filename - Original filename (used to detect file type)
 * @returns {Promise<string>} Extracted plain text
 */
async function extractText(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();

  // multer v2 may pass a Uint8Array instead of a Node.js Buffer.
  // Normalize to a proper Buffer so pdf-parse and mammoth work correctly.
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  if (ext === '.pdf') {
    return extractFromPDF(buf);
  } else if (ext === '.docx') {
    return extractFromDOCX(buf);
  } else {
    throw new Error(`Unsupported file type: ${ext}. Please upload a PDF or DOCX file.`);
  }
}

/**
 * Extract text from a PDF buffer using pdf-parse.
 */
async function extractFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (err) {
    throw new Error(`Failed to parse PDF: ${err.message}`);
  }
}

/**
 * Extract text from a DOCX buffer using mammoth.
 */
async function extractFromDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  } catch (err) {
    throw new Error(`Failed to parse DOCX: ${err.message}`);
  }
}

module.exports = { extractText };
