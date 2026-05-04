const express = require('express');
const { queryAll, queryOne, runSql } = require('../db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for post uploads (images and documents)
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './public/uploads/posts';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadPost = multer({
  storage: postStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|pdf|doc|docx|txt|zip/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('File type not allowed. Supported: images, pdf, doc, txt, zip'));
  }
});

const router = express.Router();

// GET /api/posts — list all posts
router.get('/', optionalAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const filter = req.query.filter; // 'bookmarks'

    let query = `
      SELECT p.*, u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM posts p';
    const params = [];
    const countParams = [];
    let whereClauses = [];

    if (filter === 'bookmarks' && req.user) {
      query += ' JOIN bookmarks b ON p.id = b.post_id';
      countQuery += ' JOIN bookmarks b ON p.id = b.post_id';
      whereClauses.push('b.user_id = ?');
      params.push(req.user.id);
      countParams.push(req.user.id);
    }

    if (search) {
      whereClauses.push('(p.title LIKE ? OR p.content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (whereClauses.length > 0) {
      const whereStr = ' WHERE ' + whereClauses.join(' AND ');
      query += whereStr;
      countQuery += whereStr;
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const posts = queryAll(query, params);
    const totalRow = queryOne(countQuery, countParams);
    const total = totalRow ? totalRow.total : 0;

    // If user is logged in, check which posts they've liked and bookmarked
    if (req.user) {
      const likedRows = queryAll('SELECT post_id FROM likes WHERE user_id = ?', [req.user.id]);
      const likedPostIds = likedRows.map(l => l.post_id);
      
      const bookmarkedRows = queryAll('SELECT post_id FROM bookmarks WHERE user_id = ?', [req.user.id]);
      const bookmarkedPostIds = bookmarkedRows.map(b => b.post_id);

      posts.forEach(post => {
        post.liked_by_me = likedPostIds.includes(post.id);
        post.bookmarked_by_me = bookmarkedPostIds.includes(post.id);
      });
    }

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get posts error:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /api/posts/:id — get single post
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const post = queryOne(`
      SELECT p.*, u.username, u.display_name, u.avatar_url
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [parseInt(req.params.id)]);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comments = queryAll(`
      SELECT c.*, u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [parseInt(req.params.id)]);

    if (req.user) {
      const liked = queryOne('SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [post.id, req.user.id]);
      post.liked_by_me = !!liked;
      
      const bookmarked = queryOne('SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?', [post.id, req.user.id]);
      post.bookmarked_by_me = !!bookmarked;
    }

    res.json({ post, comments });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// POST /api/posts — create a post
router.post('/', authenticateToken, uploadPost.single('file'), (req, res) => {
  try {
    const { title, content } = req.body;
    let imageUrl = null;
    let attachmentUrl = null;
    let attachmentName = null;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    if (req.file) {
      const fileUrl = `/uploads/posts/${req.file.filename}`;
      const isImage = /jpeg|jpg|png|webp/.test(req.file.mimetype);
      
      if (isImage) {
        imageUrl = fileUrl;
      } else {
        attachmentUrl = fileUrl;
        attachmentName = req.file.originalname;
      }
    }

    const result = runSql(
      'INSERT INTO posts (user_id, title, content, image_url, attachment_url, attachment_name) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, title, content, imageUrl, attachmentUrl, attachmentName]
    );

    const post = queryOne(`
      SELECT p.*, u.username, u.display_name, u.avatar_url
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json({ message: 'Post created!', post });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// PUT /api/posts/:id — update a post
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { title, content } = req.body;
    const postId = parseInt(req.params.id);

    const post = queryOne('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    runSql('UPDATE posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title || post.title, content || post.content, postId]);

    const updatedPost = queryOne(`
      SELECT p.*, u.username, u.display_name, u.avatar_url
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [postId]);

    res.json({ message: 'Post updated', post: updatedPost });
  } catch (err) {
    console.error('Update post error:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// DELETE /api/posts/:id — delete a post
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = queryOne('SELECT * FROM posts WHERE id = ?', [postId]);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    runSql('DELETE FROM posts WHERE id = ?', [postId]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// POST /api/posts/:id/like — toggle like
router.post('/:id/like', authenticateToken, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = queryOne('SELECT id FROM posts WHERE id = ?', [postId]);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingLike = queryOne('SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);

    if (existingLike) {
      runSql('DELETE FROM likes WHERE id = ?', [existingLike.id]);
      runSql('UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?', [postId]);
      res.json({ liked: false, message: 'Post unliked' });
    } else {
      runSql('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
      runSql('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [postId]);
      res.json({ liked: true, message: 'Post liked' });
    }
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// POST /api/posts/:id/bookmark — toggle bookmark
router.post('/:id/bookmark', authenticateToken, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = queryOne('SELECT id FROM posts WHERE id = ?', [postId]);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingBookmark = queryOne('SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);

    if (existingBookmark) {
      runSql('DELETE FROM bookmarks WHERE id = ?', [existingBookmark.id]);
      res.json({ bookmarked: false, message: 'Post removed from bookmarks' });
    } else {
      runSql('INSERT INTO bookmarks (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
      res.json({ bookmarked: true, message: 'Post bookmarked' });
    }
  } catch (err) {
    console.error('Bookmark error:', err);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// POST /api/posts/:id/comments — add comment
router.post('/:id/comments', authenticateToken, (req, res) => {
  try {
    const { content } = req.body;
    const postId = parseInt(req.params.id);

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const post = queryOne('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const result = runSql('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, req.user.id, content]);

    const comment = queryOne(`
      SELECT c.*, u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json({ message: 'Comment added', comment });
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// DELETE /api/posts/:id/comments/:commentId
router.delete('/:id/comments/:commentId', authenticateToken, (req, res) => {
  try {
    const comment = queryOne('SELECT * FROM comments WHERE id = ? AND post_id = ?',
      [parseInt(req.params.commentId), parseInt(req.params.id)]);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    runSql('DELETE FROM comments WHERE id = ?', [parseInt(req.params.commentId)]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
