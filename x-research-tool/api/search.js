const crypto = require("crypto");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "只接受 POST 請求。" });
  }

  try {
    const { token, query, max_results = 50, next_token = null } = req.body || {};
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "缺少 Bearer Token。" });
    }
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "缺少搜尋條件。" });
    }

    const limit = Math.min(100, Math.max(10, Number(max_results) || 50));
    const params = new URLSearchParams({
      query,
      max_results: String(limit),
      "tweet.fields": "id,author_id,created_at,lang,possibly_sensitive,public_metrics,entities,attachments",
      expansions: "attachments.media_keys",
      "media.fields": "media_key,type,duration_ms,height,width"
    });
    if (next_token) params.set("next_token", String(next_token));

    const xResp = await fetch("https://api.x.com/2/tweets/search/recent?" + params.toString(), {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json"
      }
    });

    const text = await xResp.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}

    if (!xResp.ok) {
      let msg = data?.detail || data?.title || data?.error || ("X API 回傳 HTTP " + xResp.status);
      if (xResp.status === 401) msg = "Bearer Token 無效或已失效。";
      if (xResp.status === 403) msg = "目前 X Developer 權限無法使用這個搜尋 API。";
      if (xResp.status === 429) msg = "已達 X API 使用頻率限制，請稍後再試。";
      return res.status(xResp.status).json({ error: msg });
    }

    const mediaMap = new Map((data.includes?.media || []).map(m => [m.media_key, m]));
    const rows = (data.data || []).map(post => {
      const media = (post.attachments?.media_keys || []).map(k => mediaMap.get(k)).filter(Boolean);
      const types = [...new Set(media.map(m => m.type).filter(Boolean))].sort();
      const durations = media.map(m => Number(m.duration_ms)).filter(Number.isFinite);
      const metrics = post.public_metrics || {};
      const tags = (post.entities?.hashtags || []).map(h => h.tag).filter(Boolean);
      const authorHash = post.author_id
        ? crypto.createHash("sha256").update(String(post.author_id)).digest("hex").slice(0, 16)
        : "";

      return {
        post_id: post.id || "",
        post_url: "https://x.com/i/web/status/" + (post.id || ""),
        author_hash: authorHash,
        created_at: post.created_at || "",
        lang: post.lang || "",
        possibly_sensitive: post.possibly_sensitive === true,
        media_count: media.length,
        media_types: types.join("|"),
        video_duration_ms: durations.length ? Math.max(...durations) : "",
        max_width: Math.max(0, ...media.map(m => Number(m.width) || 0)),
        max_height: Math.max(0, ...media.map(m => Number(m.height) || 0)),
        hashtags: tags.join("|"),
        like_count: metrics.like_count || 0,
        reply_count: metrics.reply_count || 0,
        retweet_count: metrics.retweet_count || 0,
        quote_count: metrics.quote_count || 0
      };
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      rows,
      next_token: data.meta?.next_token || null,
      result_count: data.meta?.result_count || rows.length
    });
  } catch (err) {
    return res.status(500).json({ error: "伺服器處理失敗：" + (err?.message || "未知錯誤") });
  }
};