// --- AI Post Automation ---
// Endpoint to get a test article format for AI
app.get('/api/ai-test-article', (req, res) => {
  res.json({
    title: 'How to Optimize Your Internet Speed in 2025',
    body: 'In this article, we explore proven strategies to boost your internet speed, including router placement, firmware updates, and choosing the right ISP. Step-by-step guides and expert tips included.',
    author: 'AI Bot',
    tags: ['Internet', 'Speed', 'Optimization', 'Guide'],
    category: 'Guide',
    date: new Date().toLocaleString(),
    readTime: 3
  });
});
import fetch from 'node-fetch';
let aiAutomationSettings = {
  enabled: false,
  frequency: 3,
  topic: 'Internet Speed',
  length: 500,
  style: 'Informative',
};

// Endpoint to get/set AI automation settings
app.get('/api/ai-automation-settings', (req, res) => {
  res.json(aiAutomationSettings);
});
app.put('/api/ai-automation-settings', (req, res) => {
  aiAutomationSettings = { ...aiAutomationSettings, ...req.body };
  res.json(aiAutomationSettings);
});

// Helper to call Qroq API
async function generateAIPost({ topic, length, style }) {
  const endpoint = 'https://api.qroq.com/v1/generate';
  // Fetch test article format for rules
  const testRes = await fetch('http://localhost:' + PORT + '/api/ai-test-article');
  const testArticle = await testRes.json();
  const payload = {
    topic,
    length: Math.max(length, 1500), // Even longer body
    style,
    rules: [
      `Write in the style: ${style}`,
      'Match the format and structure of this example article:',
      JSON.stringify(testArticle),
      'Return a JSON object matching this schema: { title, body, author, tags, category, date, readTime }.',
      'The body must be at least 1500 characters, highly detailed, and use markdown for all formatting.',
  'Include bullet points, numbered lists, subheadings, and links where appropriate. Use markdown for lists, headings, and links. For example, [Google](https://google.com).',
      'If the topic allows, add a summary section, a list of actionable tips, and a conclusion.',
  'Do not include any extraneous text outside the JSON object.',
  'Do not use any emojis in the output.',
  'If you cannot generate a valid post, return an error message in the JSON: { error: "reason" }.'
    ]
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${QROQ_API_KEY}` },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Qroq API error');
  return await res.json();
}

// Simple scheduler for AI post automation (runs every 10 minutes)
let lastAIPostTime = 0;
setInterval(async () => {
  if (!aiAutomationSettings.enabled) return;
  const now = Date.now();
  // Calculate interval in ms for frequency per week
  const intervalMs = Math.max(1, Math.floor((7 * 24 * 60 * 60 * 1000) / aiAutomationSettings.frequency));
  if (now - lastAIPostTime < intervalMs) return;
  try {
    const aiRes = await generateAIPost({
      topic: aiAutomationSettings.topic,
      length: aiAutomationSettings.length,
      style: aiAutomationSettings.style
    });
    const autoReadTime = Math.max(1, Math.ceil((aiRes.body?.split(/\s+/).length || 0) / 200));
    const newPost = new BlogPost({
      title: aiRes.title || `AI: ${aiAutomationSettings.topic}`,
      body: aiRes.body,
      author: 'AI Bot',
      tags: [aiAutomationSettings.topic, 'AI'],
      category: 'General',
      date: new Date().toLocaleString(),
      readTime: autoReadTime
    });
    await newPost.save();
    lastAIPostTime = now;
    console.log('AI post created:', newPost.title);
  } catch (err) {
    console.error('AI post automation failed:', err);
  }
}, 10 * 60 * 1000); // every 10 minutes


import express from 'express';
import cors from 'cors';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SpeedTestResult from './models/SpeedTestResult.js';
import BlogPost from './models/BlogPost.js';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Speedtestaa';
mongoose.connect(mongoUri);

// Serve static files from the frontend build (optional)
app.use(express.static(path.join(__dirname, '../dist')));

// Health check
app.get('/', (req, res) => {
  res.send('backend is running paseka 🤣🤣🔥');
});
// Edit a blog post by ID
app.put('/api/blogs/:id', async (req, res) => {
  try {
    const { body } = req.body;
    if (body && body.length < 300) {
      return res.status(400).json({ error: 'Body is too short. Must be at least 300 characters.' });
    }
    const updated = await BlogPost.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Blog post not found.' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update blog post.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running.' });
});

// Get all blog posts
app.get('/api/blogs', async (req, res) => {
  try {
    const posts = await BlogPost.find({}).sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blog posts.' });
  }
});
// Get a single blog post by ID
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Blog post not found.' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blog post.' });
  }
});
// Create a new blog post
app.post('/api/blogs', async (req, res) => {
  try {
    const { title, body, author, tags, date, readTime } = req.body;
    if (!title || !body || !date || !readTime) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    const blogPost = new BlogPost({
      title,
      body,
      author: author || 'Anonymous',
      tags: Array.isArray(tags) ? tags : [],
      date,
      readTime
    });
    await blogPost.save();
    res.status(201).json(blogPost);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create blog post.' });
  }
});

// Create a new blog post
app.post('/api/blogs', async (req, res) => {
  try {
    const { title, body, author, tags, date, readTime } = req.body;
    if (!title || !body || !date || !readTime) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    const blogPost = new BlogPost({
      title,
      body,
      author: author || 'Anonymous',
      tags: Array.isArray(tags) ? tags : [],
      date,
      readTime
    });
    await blogPost.save();
    res.status(201).json(blogPost);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create blog post.' });
  }
});
app.get('/api/results', async (req, res) => {
  try {
    const results = await SpeedTestResult.find({});
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch results.' });
  }
});

// Get a single result by ID
app.get('/api/speedtest/:id', async (req, res) => {
  try {
    const result = await SpeedTestResult.findById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Result not found.' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch result.' });
  }
});

// Submit a new speed test result
app.post('/api/speedtest', async (req, res) => {
  let { country, download, upload, ping, jitter, timestamp } = req.body;
  console.log('Received speedtest POST:', req.body);

  if (!download || !upload) {
    console.error('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  if (!country) {
    try {
      // country.is auto-detects country from request IP
      const geoRes = await fetch('https://country.is/');
      const geoData = await geoRes.json();
      country = geoData.country || 'Unknown';
    } catch (err) {
      console.error('Geo lookup failed:', err);
      country = 'Unknown';
    }
  }

  if (country === 'Unknown') {
    console.error('Country detection failed, not saving result:', req.body);
    return res.status(400).json({ error: 'Country could not be detected.' });
  }
  try {
    const result = new SpeedTestResult({ country, download, upload, ping, jitter, timestamp });
    await result.save();
    console.log('Saved result:', result);
    res.json({ success: true, country });
  } catch (err) {
    console.error('Failed to save result:', err);
    res.status(500).json({ error: 'Failed to save result.' });
  }
});

// Update a result by ID
app.put('/api/speedtest/:id', async (req, res) => {
  try {
    const updated = await SpeedTestResult.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Result not found.' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update result.' });
  }
});

// Delete a result by ID
app.delete('/api/speedtest/:id', async (req, res) => {
  try {
    const deleted = await SpeedTestResult.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Result not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete result.' });
  }
});

// Country averages
app.get('/api/country-averages', async (req, res) => {
  try {
    const results = await SpeedTestResult.aggregate([
      {
        $group: {
          _id: '$country',
          avgDownload: { $avg: '$download' },
          avgUpload: { $avg: '$upload' },
          avgPing: { $avg: '$ping' },
          avgJitter: { $avg: '$jitter' },
          tests: { $sum: 1 }
        }
      },
      {
        $project: {
          country: '$_id',
          avgDownload: 1,
          avgUpload: 1,
          avgPing: 1,
          avgJitter: 1,
          tests: 1,
          _id: 0
        }
      }
    ]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch country averages.' });
  }
});

// SPA fallback
app.get(/^((?!\/api\/).)*$/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
