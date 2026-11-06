const express = require('express');
const router = express.Router();
const { requireApiKey } = require('../middleware/apiAuth');
const tiktok = require('@tobyg74/tiktok-api-dl');

// ── 1. YouTube Song Download ─────
router.get('/song', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });
    
    const ytdl = require('ytdl-core');
    if (!ytdl.validateURL(url)) return res.status(400).json({ error: 'Invalid YouTube URL' });

    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

    res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp3"`);
    res.header('Content-Type', 'audio/mpeg');
    ytdl(url, { format: format }).pipe(res);

  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching song details' });
  }
});

// ── 2. TikTok Video Download (Reliable Package) ─────
router.get('/tiktok', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a TikTok URL' });

    // TikTok එකෙන් ඩේටා ගන්නවා
    const result = await tiktok.Downloader(url, { version: 'v1' });

    if (result.status !== 'success') {
      return res.status(404).json({ error: 'Failed to extract TikTok video. Link might be invalid.' });
    }

    const data = result.result;

    // WhatsApp Bot එකට ඕන කරන විදියට JSON එක හදනවා
    res.json({
      success: true,
      title: data.description || 'TikTok Video',
      author: data.author?.nickname || 'Unknown',
      video_url: data.video?.playAddr[0] || null,
      music_url: data.music?.playUrl[0] || null,
      thumbnail: data.video?.cover[0] || null
    });

  } catch (err) {
    console.error('TikTok API Error:', err);
    res.status(500).json({ error: 'Server error while fetching TikTok video' });
  }
});

module.exports = router;
