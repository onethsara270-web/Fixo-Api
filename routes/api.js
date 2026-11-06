const express = require('express');
const router = express.Router();
const axios = require('axios');
const ytdl = require('@distube/ytdl-core'); // අපේම ක්‍රමය
const { requireApiKey } = require('../middleware/apiAuth');

// ── 1. YouTube Song (MP3 Stream) ─────
router.get('/song', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });
    if (!ytdl.validateURL(url)) return res.status(400).json({ error: 'Invalid YouTube URL' });

    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

    res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(info.videoDetails.title)}.mp3"`);
    res.header('Content-Type', 'audio/mpeg');
    
    // කෙලින්ම ස්ට්‍රීම් කරනවා
    ytdl(url, { format: format }).pipe(res);

  } catch (err) {
    console.error('[Song API]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching song details' });
  }
});

// ── 2. YouTube Video (MP4 Stream) ─────
router.get('/video', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });
    if (!ytdl.validateURL(url)) return res.status(400).json({ error: 'Invalid YouTube URL' });

    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' });

    res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(info.videoDetails.title)}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    ytdl(url, { format: format }).pipe(res);

  } catch (err) {
    console.error('[Video API]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching video details' });
  }
});

// ── 3. TikTok Video Download (JSON) ─────
// (TikTok එකට අපේම ක්‍රමයක් හදන එක අමාරු නිසා මේක tikwm API එකෙන් තියෙනවා)
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
