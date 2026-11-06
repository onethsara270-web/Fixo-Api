const express = require('express');
const router = express.Router();
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

// ── 2. TikTok Video Download (අපේම ක්‍රමය - No Packages!) ─────
router.get('/tiktok', requireApiKey, async (req, res) => {
  try {
    let { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Please provide a TikTok URL' });
    }

    // 1. Short Link එකක් නම් (vm.tiktok.com), ඒක ලොකු ලින්ක් එකට හරවගන්න ඕන
    if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status >= 300 && response.status < 400) {
        url = response.headers.get('location');
      }
    }

    // 2. වෙබ් පේජ් එකේ HTML එක ගන්නවා
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await pageRes.text();

    // 3. HTML එක ඇතුලේ හංගලා තියෙන JSON ඩේටා එක Regex වලින් හොයාගන්නවා
    const match = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);
    
    if (!match) {
      return res.status(404).json({ error: 'Could not find video data. TikTok might be blocking the request.' });
    }

    const jsonData = JSON.parse(match[1]);
    
    // 4. ඩේටා එක ඇතුලේ අපිට ඕන කෑලි ටික තියෙන තැන හොයාගන්නවා
    const scope = jsonData['__DEFAULT_SCOPE__'];
    if (!scope || !scope['webapp.video-detail']) {
      return res.status(404).json({ error: 'Video data not found in JSON.' });
    }

    const itemInfo = scope['webapp.video-detail'].itemInfo;
    const itemStruct = itemInfo.itemStruct;

    // 5. අපිට ඕන දේවල් ටික අරගන්නවා
    const title = itemStruct.desc || 'TikTok Video';
    const author = itemStruct.author?.nickname || 'Unknown';
    const videoUrl = itemStruct.video?.playAddr || null;

    // 6. WhatsApp Bot එකට යවන්න ලස්සනට JSON එකක් විදියට එවනවා
    res.json({
      success: true,
      title: title,
      author: author,
      video_url: videoUrl
    });

  } catch (err) {
    console.error('TikTok API Error:', err);
    res.status(500).json({ error: 'Server error while fetching TikTok video' });
  }
});

module.exports = router;
