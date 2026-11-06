const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Innertube } = require('youtubei.js'); // අලුත් ලයිබ්‍රරි එක
const { requireApiKey } = require('../middleware/apiAuth');
const { Readable } = require('stream');

// ── 1. YouTube Song (MP3 Stream) ─────
router.get('/song', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });

    // URL එකෙන් Video ID එක විතරක් ගන්නවා
    const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
    if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });

    const youtube = await Innertube.create();
    
    // YouTube App එකෙන් වගේ ඩවුන්ලෝඩ් ලින්ක් එක ගන්නවා
    const stream = await youtube.download(videoId, {
      type: 'audio',
      quality: 'best',
      format: 'mp4' // Audio එකට mp4 (m4a) පාවිච්චි කරනවා
    });

    res.header('Content-Type', 'audio/mp4');
    // Node.js stream එකකට හරවලා ස්ට්‍රීම් කරනවා
    Readable.fromWeb(stream).pipe(res);

  } catch (err) {
    console.error('[Song API Error]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching song details' });
  }
});

// ── 2. YouTube Video (MP4 Stream) ─────
router.get('/video', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });

    const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
    if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });

    const youtube = await Innertube.create();
    
    const stream = await youtube.download(videoId, {
      type: 'video+audio',
      quality: 'best',
      format: 'mp4'
    });

    res.header('Content-Type', 'video/mp4');
    Readable.fromWeb(stream).pipe(res);

  } catch (err) {
    console.error('[Video API Error]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching video details' });
  }
});

// ── 3. TikTok Video Download ─────
router.get('/tiktok', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a TikTok URL' });

    const config = {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000
    };

    const apiRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, config);
    const result = apiRes.data;

    if (result.code !== 0 || !result.data) {
      return res.status(404).json({ error: 'TikTok video not found or private.' });
    }

    const data = result.data;
    res.json({
      success: true,
      title: data.title || 'TikTok Video',
      author: data.author?.nickname || 'Unknown',
      video_url: data.play,
      music_url: data.music_info?.play || null,
      thumbnail: data.cover || null
    });

  } catch (err) {
    console.error('TikTok API Error:', err.message);
    res.status(500).json({ error: 'Server error while fetching TikTok video. Try again.' });
  }
});

module.exports = router;
