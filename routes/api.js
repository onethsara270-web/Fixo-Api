const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireApiKey } = require('../middleware/apiAuth');

// ── Helper: Stream URL to Response ─────
// අපි ලින්ක් එකක් අරගෙන ඒක කෙලින්ම ෆෝන් එකට/බොට් එකට ස්ට්‍රීම් කරනවා
async function streamMedia(url, res, filename, mimetype) {
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': '*/*'
      }
    });

    res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.header('Content-Type', mimetype);
    
    response.data.pipe(res);
  } catch (err) {
    console.error('Streaming error:', err.message);
    res.status(500).json({ error: 'Failed to stream media file' });
  }
}

// ── 1. YouTube Song (MP3) ─────
router.get('/song', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });

    // Render බ්ලොක් නොවෙන්න Third-party API එකකින් ලින්ක් එක ගන්නවා
    const apiRes = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`, { timeout: 15000 });
    
    if (!apiRes.data?.status || !apiRes.data?.result?.download?.url) {
      throw new Error('API failed to extract audio');
    }

    const downloadUrl = apiRes.data.result.download.url;
    const title = apiRes.data.result.metadata?.title || 'song';

    // ලින්ක් එක බොට් එකට ස්ට්‍රීම් කරනවා
    await streamMedia(downloadUrl, res, `${title}.mp3`, 'audio/mpeg');

  } catch (err) {
    console.error('[Song API]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching song details' });
  }
});

// ── 2. YouTube Video (MP4) ─────
router.get('/video', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL' });

    // වීඩියෝ එකටත් වෙනම API එකක්
    const apiRes = await axios.get(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`, { timeout: 15000 });
    
    if (!apiRes.data?.status || !apiRes.data?.result?.download?.url) {
      throw new Error('API failed to extract video');
    }

    const downloadUrl = apiRes.data.result.download.url;
    const title = apiRes.data.result.metadata?.title || 'video';

    await streamMedia(downloadUrl, res, `${title}.mp4`, 'video/mp4');

  } catch (err) {
    console.error('[Video API]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Error fetching video details' });
  }
});

// ── 3. TikTok Video Download ─────
router.get('/tiktok', requireApiKey, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Please provide a TikTok URL' });

    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
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
