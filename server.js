
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
