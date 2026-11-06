const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireApiKey } = require('../middleware/apiAuth');

// ── 1. YouTube Song (MP3 JSON) ─────
router.get('/song', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });

    // ඩවුන්ලෝඩ් ලින්ක් එක විතරක් ගන්නවා
    const apiRes = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`, { timeout: 15000 });
    
    if (!apiRes.data?.status || !apiRes.data?.result?.download?.url) {
      throw new Error('API failed to extract audio');
    }

    const downloadUrl = apiRes.data.result.download.url;
    const title = apiRes.data.result.metadata?.title || 'song';

    res.json({
      success: true,
      title: title,
      download_url: downloadUrl
    });

  } catch (err) {
    console.error('[Song API]', err.message);
    res.status(500).json({ error: 'Error fetching song details' });
  }
});

// ── 2. YouTube Video (MP4 JSON) ─────
router.get('/video', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });

    const apiRes = await axios.get(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`, { timeout: 15000 });
    
    if (!apiRes.data?.status || !apiRes.data?.result?.download?.url) {
      throw new Error('API failed to extract video');
    }

    const downloadUrl = apiRes.data.result.download.url;
    const title = apiRes.data.result.metadata?.title || 'video';

    res.json({
      success: true,
      title: title,
      download_url: downloadUrl
    });

  } catch (err) {
    console.error('[Video API]', err.message);
    res.status(500).json({ error: 'Error fetching video details' });
  }
});

// ── 3. TikTok Video Download (JSON) ─────
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
