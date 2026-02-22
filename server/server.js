/**
 * LFG API for Pie Guy Guide.
 * Backed by Supabase (Postgres). Run: npm start (port 3765 or PORT).
 * Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env or project root .env.
 */
const path = require("path");
require("dotenv").config();
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
}
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3765;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in server/.env or the project root .env (copy server/.env.example for reference).");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.use(cors());
app.use(express.json());

function norm(s) {
  return (s || "").trim().toLowerCase();
}

function postRowToApi(row) {
  if (!row) return null;
  const tags = row.tags;
  return {
    id: row.id,
    authorName: row.author_name,
    text: row.text,
    description: row.description != null ? row.description : "",
    tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
    language: row.language != null ? row.language : "English",
    slots: row.slots,
    server: row.server,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
  };
}

// GET /api/posts?server=1&tag=...&language=... — list posts (optional filters)
app.get("/api/posts", async (req, res) => {
  const server = (req.query.server || "").trim();
  const tag = (req.query.tag || "").trim();
  const language = (req.query.language || "").trim();
  if (!server) return res.status(400).json({ error: "server query required" });
  try {
    let q = supabase
      .from("lfg_posts")
      .select("id, author_name, text, description, tags, language, slots, server, created_at")
      .eq("server", server);
    if (tag) q = q.contains("tags", [tag]);
    if (language) q = q.eq("language", language);
    const { data: posts, error: postsErr } = await q.order("created_at", { ascending: false });
    if (postsErr) return res.status(500).json({ error: postsErr.message });
    const list = [];
    for (const p of posts || []) {
      const { count: interestedCount } = await supabase
        .from("lfg_interested")
        .select("id", { count: "exact", head: true })
        .eq("post_id", p.id);
      const { count: commentCount } = await supabase
        .from("lfg_comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", p.id);
      list.push({
        ...postRowToApi(p),
        interestedCount: interestedCount ?? 0,
        commentCount: commentCount ?? 0
      });
    }
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// GET /api/posts/:id — one post with full interested list
app.get("/api/posts/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid post id" });
  try {
    const { data: post, error: postErr } = await supabase
      .from("lfg_posts")
      .select("id, author_name, text, description, tags, language, slots, server, created_at")
      .eq("id", id)
      .single();
    if (postErr || !post) return res.status(404).json({ error: "Post not found" });
    const { data: interestedRows } = await supabase
      .from("lfg_interested")
      .select("player_name")
      .eq("post_id", id)
      .order("id");
    const interested = (interestedRows || []).map((r) => r.player_name);
    res.json({ ...postRowToApi(post), interested });
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// GET /api/posts/:id/comments
app.get("/api/posts/:id/comments", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid post id" });
  try {
    const { data: postExists } = await supabase.from("lfg_posts").select("id").eq("id", id).maybeSingle();
    if (!postExists) return res.status(404).json({ error: "Post not found" });
    const { data: rows, error } = await supabase
      .from("lfg_comments")
      .select("author_name, text, created_at")
      .eq("post_id", id)
      .order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    const list = (rows || []).map((r) => ({
      authorName: r.author_name,
      text: r.text,
      createdAt: r.created_at ? new Date(r.created_at).getTime() : null
    }));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// POST /api/posts — create post (no duplicate author per server)
app.post("/api/posts", async (req, res) => {
  const { authorName, text, description, tags, language, slots, server } = req.body || {};
  const name = (authorName || "").trim();
  const body = (text || "").trim();
  const desc = (description != null && description !== undefined) ? String(description) : "";
  const tagArr = Array.isArray(tags) ? tags.filter((t) => t && String(t).trim()) : (tags ? [String(tags).trim()].filter(Boolean) : []);
  const lang = (language != null && language !== undefined && String(language).trim()) ? String(language).trim() : "English";
  const serverVal = String(server || "").trim() || "1";
  const slotCount = Math.max(1, Math.min(20, parseInt(slots, 10) || 4));
  if (!name) return res.status(400).json({ error: "authorName required" });
  try {
    const { data: existingList } = await supabase
      .from("lfg_posts")
      .select("id, author_name")
      .eq("server", serverVal);
    const existing = (existingList || []).find((p) => norm(p.author_name) === norm(name));
    if (existing) {
      return res.status(400).json({
        error: "This character name already has a post on this server. Only one post per character per server."
      });
    }
    const { data: inserted, error } = await supabase
      .from("lfg_posts")
      .insert({ author_name: name, text: body, description: desc, tags: tagArr, language: lang, slots: slotCount, server: serverVal })
      .select("id, author_name, text, description, tags, language, slots, server, created_at")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(postRowToApi(inserted));
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// POST /api/posts/:id/interested — add self (enforce slots; no duplicate name)
app.post("/api/posts/:id/interested", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const playerName = (req.body?.playerName ?? req.body?.player ?? "").trim();
  if (!playerName) return res.status(400).json({ error: "playerName required" });
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid post id" });
  try {
    const { data: post, error: postErr } = await supabase.from("lfg_posts").select("id, slots, author_name").eq("id", id).single();
    if (postErr || !post) return res.status(404).json({ error: "Post not found" });
    const { count } = await supabase.from("lfg_interested").select("id", { count: "exact", head: true }).eq("post_id", id);
    if (count >= post.slots) return res.status(400).json({ error: "No slots left" });
    const { data: inserted, error } = await supabase
      .from("lfg_interested")
      .insert({ post_id: id, player_name: playerName })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") {
        const { data: list } = await supabase.from("lfg_interested").select("player_name").eq("post_id", id);
        const interested = (list || []).map((r) => r.player_name);
        return res.json({ ...postRowToApi(await getPostById(id)), interested });
      }
      return res.status(500).json({ error: error.message });
    }
    const { data: fullPost } = await supabase.from("lfg_posts").select("*").eq("id", id).single();
    const { data: list } = await supabase.from("lfg_interested").select("player_name").eq("post_id", id);
    res.json({ ...postRowToApi(fullPost), interested: (list || []).map((r) => r.player_name) });
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

async function getPostById(id) {
  const { data } = await supabase.from("lfg_posts").select("*").eq("id", id).single();
  return data;
}

// DELETE /api/posts/:id/interested
app.delete("/api/posts/:id/interested", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { playerNameToRemove, requesterName } = req.body || {};
  const toRemove = (playerNameToRemove || "").trim();
  const requester = (requesterName || "").trim();
  if (!toRemove || !requester) return res.status(400).json({ error: "playerNameToRemove and requesterName required" });
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid post id" });
  try {
    const { data: post, error: postErr } = await supabase.from("lfg_posts").select("id, author_name, text, slots, server, created_at").eq("id", id).single();
    if (postErr || !post) return res.status(404).json({ error: "Post not found" });
    const isAuthor = norm(requester) === norm(post.author_name);
    const isSelf = norm(requester) === norm(toRemove);
    if (!isAuthor && !isSelf) return res.status(403).json({ error: "Only the poster can remove others; you can only remove yourself" });
    const { data: rows } = await supabase.from("lfg_interested").select("id, player_name").eq("post_id", id);
    const row = (rows || []).find((r) => norm(r.player_name) === norm(toRemove));
    if (!row) {
      const { data: list } = await supabase.from("lfg_interested").select("player_name").eq("post_id", id);
      return res.json({ ...postRowToApi(post), interested: (list || []).map((r) => r.player_name) });
    }
    await supabase.from("lfg_interested").delete().eq("id", row.id);
    const { data: list } = await supabase.from("lfg_interested").select("player_name").eq("post_id", id);
    res.json({ ...postRowToApi(post), interested: (list || []).map((r) => r.player_name) });
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// DELETE /api/posts/:id — author only (body: { authorName })
app.delete("/api/posts/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const authorName = (req.body?.authorName || "").trim();
  if (!authorName) return res.status(400).json({ error: "authorName required" });
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid post id" });
  try {
    const { data: post, error: postErr } = await supabase.from("lfg_posts").select("id, author_name").eq("id", id).single();
    if (postErr || !post) return res.status(404).json({ error: "Post not found" });
    if (norm(post.author_name) !== norm(authorName)) return res.status(403).json({ error: "Only the author can delete this post" });
    await supabase.from("lfg_posts").delete().eq("id", id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// POST /api/posts/:id/comments
app.post("/api/posts/:id/comments", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { authorName, text } = req.body || {};
  const name = (authorName || "").trim();
  const body = (text || "").trim();
  if (!name || !body) return res.status(400).json({ error: "authorName and text required" });
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid post id" });
  try {
    const { data: post, error: postErr } = await supabase.from("lfg_posts").select("id").eq("id", id).single();
    if (postErr || !post) return res.status(404).json({ error: "Post not found" });
    const { error: insertErr } = await supabase.from("lfg_comments").insert({ post_id: id, author_name: name, text: body });
    if (insertErr) return res.status(500).json({ error: insertErr.message });
    const { data: rows } = await supabase.from("lfg_comments").select("author_name, text, created_at").eq("post_id", id).order("created_at", { ascending: true });
    const list = (rows || []).map((r) => ({
      authorName: r.author_name,
      text: r.text,
      createdAt: r.created_at ? new Date(r.created_at).getTime() : null
    }));
    res.status(201).json(list);
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/", (req, res) => res.redirect(302, "/api/health"));

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log("LFG API (Supabase) running on port " + PORT);
});
