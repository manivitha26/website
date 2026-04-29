const { initDb, runSql } = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Seeding database...');
  await initDb();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Users
  console.log('Creating users...');
  const users = [
    { username: 'alex_dev', email: 'alex@example.com', display_name: 'Alex Rivera', bio: 'Full-stack developer & design enthusiast.' },
    { username: 'sarah_m', email: 'sarah@example.com', display_name: 'Sarah Mitchell', bio: 'Digital nomad and coffee lover ☕' },
    { username: 'creative_sam', email: 'sam@example.com', display_name: 'Sam Wilson', bio: 'Building the future of social tech.' },
    { username: 'travel_luna', email: 'luna@example.com', display_name: 'Luna Skye', bio: 'Exploring the hidden corners of the world 🌍' },
    { username: 'chef_marco', email: 'marco@example.com', display_name: 'Marco Rossi', bio: 'Pasta, Pizza, and Passion. Chef at Ristorante Stella.' },
    { username: 'pixel_perfect', email: 'pixel@example.com', display_name: 'Elena Vance', bio: 'Landscape photographer | Sony A7R IV' }
  ];

  const { queryOne } = require('./db');
  const userIds = [];
  for (const user of users) {
    try {
      runSql(
        'INSERT INTO users (username, email, password, display_name, bio) VALUES (?, ?, ?, ?, ?)',
        [user.username, user.email, passwordHash, user.display_name, user.bio]
      );
      console.log(`User ${user.username} created.`);
    } catch (e) {
      console.log(`User ${user.username} already exists.`);
    }
    
    const existingUser = queryOne('SELECT id FROM users WHERE username = ?', [user.username]);
    userIds.push(existingUser.id);
  }

  // 2. Create Posts
  console.log('Creating posts...');
  const posts = [
    {
      user_id: userIds[0],
      title: 'Just launched my new project!',
      content: 'I have been working on this social platform for weeks. Excited to finally share it with everyone! What do you think about the glassmorphism design?',
      image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=1000'
    },
    {
      user_id: userIds[1],
      title: 'Monday Mornings...',
      content: 'Nothing beats a fresh cup of coffee and a clean workspace to start the week. 💻☕',
      image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=1000'
    },
    {
      user_id: userIds[3],
      title: 'Missing the Swiss Alps',
      content: 'Woke up today dreaming about the fresh mountain air and these incredible views. Switzerland, you have my heart! 🏔️✨',
      image_url: 'https://images.unsplash.com/photo-1531366930477-4fbd7358ba9d?auto=format&fit=crop&q=80&w=1000'
    },
    {
      user_id: userIds[4],
      title: 'Secret to the perfect carbonara',
      content: 'Guanciale, Pecorino Romano, and high-quality eggs. That is it! No cream allowed in this kitchen 🙅‍♂️🍝',
      image_url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&q=80&w=1000'
    },
    {
      user_id: userIds[5],
      title: 'The Golden Hour',
      content: 'Caught this sunset at the Oregon coast yesterday. The light was just perfect for long exposure. 🌊📸',
      image_url: 'https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&q=80&w=1000'
    },
    {
      user_id: userIds[2],
      title: 'The Future of AI',
      content: 'AI is changing how we build software forever. The productivity gains are insane! Who else is using LLMs in their daily workflow?',
      image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1000'
    }
  ];

  const postIds = [];
  for (const post of posts) {
    const result = runSql(
      'INSERT INTO posts (user_id, title, content, image_url) VALUES (?, ?, ?, ?)',
      [post.user_id, post.title, post.content, post.image_url]
    );
    postIds.push(result.lastInsertRowid);
  }

  // 3. Create Comments
  console.log('Adding comments...');
  runSql('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', [postIds[0], userIds[1], 'Looks amazing, Alex! The animations are super smooth.']);
  runSql('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', [postIds[0], userIds[2], 'Great work! Is this using vanilla JS or a framework?']);
  runSql('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', [postIds[2], userIds[0], 'Couldn’t agree more. It’s a total game changer.']);

  // 4. Create Likes
  console.log('Adding likes...');
  runSql('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postIds[0], userIds[1]]);
  runSql('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postIds[0], userIds[2]]);
  runSql('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postIds[1], userIds[0]]);
  
  // Update like counts
  runSql('UPDATE posts SET likes_count = (SELECT COUNT(*) FROM likes WHERE post_id = posts.id)');

  console.log('✅ Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
