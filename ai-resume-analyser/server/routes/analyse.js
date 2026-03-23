/**
 * analyze.js
 * Express router for the /api/analyze endpoint.
 * Handles file upload, text extraction, AI analysis, and result storage.
 */

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { extractText } = require('../utils/extractText');
const { analyzeResume } = require('../utils/openaiClient');

const router = express.Router();

// Store uploaded files in memory (no disk write needed - we just read the buffer)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed.'));
    }
  },
});

// Results directory for saving analysis JSON
const RESULTS_DIR = path.join(__dirname, '..', 'results');
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * POST /api/analyze
 * Body: multipart/form-data with fields:
 *   - resume: File (PDF or DOCX)
 *   - jobDescription: String (optional)
 */
router.post('/analyze', upload.single('resume'), async (req, res) => {
  try {
    // Validate file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded.' });
    }

    const { originalname, buffer } = req.file;
    const jobDescription = req.body.jobDescription || '';

    // Step 1: Extract text from the uploaded file
    console.log(`[ANALYZE] Extracting text from: ${originalname}`);
    const resumeText = await extractText(buffer, originalname);

    if (!resumeText || resumeText.length < 50) {
      return res.status(422).json({
        error: 'Could not extract sufficient text from the file. Please ensure the file is not scanned/image-based.',
      });
    }

    // Step 2: Send to OpenAI for analysis
    console.log(`[ANALYZE] Sending ${resumeText.length} chars to OpenAI...`);
    const analysis = await analyzeResume(resumeText, jobDescription);

    // Step 3: Add metadata and save result
    const resultId = uuidv4();
    const result = {
      id: resultId,
      filename: originalname,
      analyzedAt: new Date().toISOString(),
      hasJobDescription: !!jobDescription,
      ...analysis,
    };

    // Save to results folder (bonus feature)
    const resultPath = path.join(RESULTS_DIR, `${resultId}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log(`[ANALYZE] Saved result to ${resultPath}`);

    res.json(result);
  } catch (err) {
    console.error('[ANALYZE ERROR]', err.message);
    res.status(500).json({ error: err.message || 'Internal server error during analysis.' });
  }
});

/**
 * GET /api/results
 * Returns list of all saved analysis results (metadata only).
 */
router.get('/results', (req, res) => {
  try {
    const files = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'));
    const results = files.map((file) => {
      const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf-8'));
      return {
        id: data.id,
        filename: data.filename,
        score: data.score,
        analyzedAt: data.analyzedAt,
        hasJobDescription: data.hasJobDescription,
      };
    });
    // Sort newest first
    results.sort((a, b) => new Date(b.analyzedAt) - new Date(a.analyzedAt));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/results/:id
 * Returns a specific saved analysis result.
 */
router.get('/results/:id', (req, res) => {
  try {
    const filePath = path.join(RESULTS_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Result not found.' });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
