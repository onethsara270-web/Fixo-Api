const express = require('express');
const router = express.Router();
const axios = require('axios'); // මේක අනිවාර්යයෙන් ඕන
const { requireApiKey } = require('../middleware/apiAuth');

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

// ── 2. TikTok Video Download (Fixo Guaranteed) ─────
router.get('/tiktok', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a TikTok URL' });

    // Browser එකකින් එනවා වගේ පෙන්නන්න User-Agent එකක් යවනවා
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    };

    // tikwm API එකට රික්වෙස්ට් එක යවනවා
    const apiRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, config);
    const result = apiRes.data;

    // ඩේටා ආවේ නැත්නම් Error එකක් යවනවා
    if (result.code !== 0 || !result.data) {
      return res.status(404).json({ error: 'TikTok video not found or private.' });
    }

    const data = result.data;

    // Bot එකට ඕන කරන විදියට JSON එක හදනවා
    res.json({
      success: true,
      title: data.title || 'TikTok Video',
      author: data.author?.nickname || 'Unknown',
      video_url: data.play, // කෙලින්ම playable link එක
      music_url: data.music_info?.play || null,
      thumbnail: data.cover || null
    });

  } catch (err) {
    console.error('TikTok API Error:', err.message);
    res.status(500).json({ error: 'Server error while fetching TikTok video. Try again.' });
  }
});

module.exports = router;
