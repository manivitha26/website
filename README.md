# Nexus — Full-Stack Social Platform

A modern, full-stack web application with real authentication, database integration, and a beautiful UI.

## 🚀 Features

- **Real Authentication** — Secure signup/login with bcrypt password hashing & JWT tokens
- **SQLite Database** — Persistent data storage for users, posts, comments, and likes
- **RESTful API** — Full CRUD operations with proper validation and error handling
- **Modern UI** — Dark glassmorphism design with smooth animations
- **Rate Limiting** — Built-in protection against brute force attacks
- **Responsive** — Works perfectly on desktop, tablet, and mobile

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (via sql.js) |
| **Auth** | bcrypt + JWT |
| **Security** | Rate limiting, CORS, httpOnly cookies |

## 📦 Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm run dev

# Open in browser
# http://localhost:3000
```

## 🌐 Deployment (Render)

1. Push this project to a GitHub repository
2. Go to [render.com](https://render.com) and create a **New Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:** Set `JWT_SECRET` to a secure random string and `NODE_ENV` to `production`
5. Deploy!

## 📝 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create a new account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/change-password` | Change password |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | List posts (with search & pagination) |
| POST | `/api/posts` | Create a post |
| GET | `/api/posts/:id` | Get a single post |
| PUT | `/api/posts/:id` | Update a post |
| DELETE | `/api/posts/:id` | Delete a post |
| POST | `/api/posts/:id/like` | Toggle like |
| POST | `/api/posts/:id/comments` | Add a comment |
| DELETE | `/api/posts/:id/comments/:cid` | Delete a comment |

## 📁 Project Structure

```
website/
├── server.js              # Express server & middleware
├── db.js                  # SQLite database layer (sql.js)
├── .env                   # Environment variables
├── package.json
├── render.yaml            # Render deployment config
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── routes/
│   ├── auth.js            # Auth routes (signup/login/etc)
│   └── posts.js           # Posts, comments, likes routes
└── public/
    ├── index.html         # SPA frontend
    ├── styles.css          # Design system & styles
    └── app.js             # Frontend application logic
```

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | Secret key for JWT tokens | *(required)* |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `NODE_ENV` | Environment | `development` |
