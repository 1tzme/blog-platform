`README.md`

# Blogging Platform

A minimalistic blogging platform built with MongoDB (NoSQL) for the "Advanced Databases" course final project. Features user authentication, CRUD operations for posts and comments, and a clean blue-themed UI.

## Setup Instructions

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB (local or cloud, e.g., MongoDB Atlas)
- Git

### Installation
1. **Clone the Repository**
   ```bash
   git clone https://github.com/[your-username]/[your-repo].git
   cd [your-repo]
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   - Create a `.env` file in the root directory:
     ```env
     PORT=3000
     SECRET_KEY=your-secret-key
     dbURL=mongodb://localhost:27017/blogging_platform
     ```
   - Replace `dbURL` with your MongoDB connection string if using a cloud instance.

4. **Run the Server**
   ```bash
   node server.js
   ```
   - Access the app at `http://localhost:3000`.

### Notes
- Ensure MongoDB is running before starting the server.
- Static files (HTML/CSS/JS) are served from the `public` directory.

## Database Schema

The project uses MongoDB with three collections:

### `users`
- Stores user authentication data.
- Schema:
  ```json
  {
    "_id": "ObjectId",
    "username": { "type": "String", "required": true, "unique": true },
    "password": { "type": "String", "required": true }
  }
  ```

### `blogs`
- Stores blog posts with references to users.
- Schema:
  ```json
  {
    "_id": "ObjectId",
    "title": { "type": "String", "required": true },
    "body": { "type": "String", "required": true },
    "author": { "type": "ObjectId", "ref": "User" },
    "createdAt": "Date",
    "updatedAt": "Date"
  }
  ```

### `comments`
- Stores comments linked to posts and users.
- Schema:
  ```json
  {
    "_id": "ObjectId",
    "postId": { "type": "ObjectId", "ref": "Blog", "required": true },
    "author": { "type": "ObjectId", "ref": "User", "required": true },
    "text": { "type": "String", "required": true },
    "createdAt": "Date",
    "updatedAt": "Date"
  }
  ```

- **Relationships**: 
  - `blogs.author` → `users._id`
  - `comments.postId` → `blogs._id`
  - `comments.author` → `users._id`

## API Endpoints

| Method | Endpoint                  | Description                       | Auth Required |
|--------|---------------------------|-----------------------------------|---------------|
| POST   | `/auth/register`          | Register a new user              | No            |
| POST   | `/auth/login`             | Login and get JWT token          | No            |
| POST   | `/auth/check-username`    | Check username availability      | No            |
| POST   | `/posts`                  | Create a new post                | Yes           |
| GET    | `/posts`                  | Get all posts                    | No            |
| GET    | `/posts/user`             | Get user's posts                 | Yes           |
| GET    | `/posts/:id`              | Get post by ID                   | No            |
| PUT    | `/posts/:id`              | Update post by ID                | Yes           |
| DELETE | `/posts/:id`              | Delete post and its comments     | Yes           |
| POST   | `/posts/:id/comments`     | Add comment to post              | Yes           |
| GET    | `/posts/:id/comments`     | Get comments for post            | No            |

- **Authentication**: Use `Authorization: Bearer [token]` header for protected routes.

## Database Design Notes
- **Indexing**: Timestamps (`createdAt`, `updatedAt`) indexed via `{ timestamps: true }`.
- **Optimization**: Uses `populate('author', 'username')` for efficient user data retrieval.

## Project Structure
```
/your-repo
├── public/
│   ├── index.html
│   ├── profile.html
│   ├── post.html
│   ├── auth.html
│   ├── script.js
│   └── styles.css
├── server.js
├── .env
└── package.json
```
