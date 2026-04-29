const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.db');

async function setup() {
  console.log('⏳ Starting database setup...');
  
  const SQL = await initSqlJs();
  let db;

  // Create new database
  db = new SQL.Database();

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  console.log('Creating tables...');
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT DEFAULT NULL,
      bio TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      is_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT DEFAULT NULL,
      likes_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  console.log('Creating indexes...');
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id)');

  // Save the database file
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);

  console.log('✅ Database setup complete! "database.db" created.');
  db.close();
}

setup().catch(err => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
