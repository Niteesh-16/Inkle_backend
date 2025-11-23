# Inkle Social Activity Feed Backend

This is a Node.js + Express + PostgreSQL backend for a small social network style activity feed. It supports users, posts, likes, follows, blocking, and role-based permissions (user/admin/owner). I also included a full Postman collection and a separate API documentation file.

If you want the endpoint-by-endpoint details, including request/response examples, please read:

- [`API_DOCS.md`](./API_DOCS.md)

Below is a short overview of what I built and how to run it.

## Features

- JWT-based auth (signup / login / `GET /auth/me`).
- Roles: `USER`, `ADMIN`, `OWNER`.
  - `ADMIN` can delete any user/post/like.
  - `OWNER` can do everything an admin can and manage admins.
- Social features:
  - Create posts, like/unlike posts, follow/unfollow users.
  - Block users (mutual hiding of posts in feed).
- Global activity wall that records actions such as:
  - "ABC made a post" (post created).
  - "DEF followed ABC" (follow).
  - "PQR liked ABC's post" (like).
  - "User deleted by 'Owner'" / "User deleted by 'Admin'".
  - "Post deleted by 'Admin'" / "Post deleted by 'OWNER'" / self-deletes.
- Postman collection included (`postman_collection.json`).
- Detailed API docs included (`API_DOCS.md`).

---

## Deployed API

The backend is deployed on Render. You can use it directly without running anything locally.

- **Base URL (deployed)**: [https://inkle-backend-le9w.onrender.com](https://inkle-backend-le9w.onrender.com)
- **Health check**: [https://inkle-backend-le9w.onrender.com/health](https://inkle-backend-le9w.onrender.com/health)

If the deployment is healthy, the health endpoint returns:

```json
{ "status": "ok" }
```

All other endpoints described in `API_DOCS.md` are available under the same base URL. For example:

- POST [https://inkle-backend-le9w.onrender.com/auth/signup](https://inkle-backend-le9w.onrender.com/auth/signup)
- POST [https://inkle-backend-le9w.onrender.com/auth/login](https://inkle-backend-le9w.onrender.com/auth/login)
- GET  [https://inkle-backend-le9w.onrender.com/posts](https://inkle-backend-le9w.onrender.com/posts)
- GET  [https://inkle-backend-le9w.onrender.com/activities](https://inkle-backend-le9w.onrender.com/activities)

You can call these using the provided Postman collection (by setting `base_url` to the deployed URL) or any HTTP client (`curl`, browser devtools `fetch`, etc.).

---

## How to call the main endpoints

This is a quick reference for how to talk to the API. Full details and more endpoints are in [`API_DOCS.md`](./API_DOCS.md).

### Auth

- **Signup**
  - Method/URL: `POST /auth/signup`
  - Auth: none
  - JSON body:
    ```json
    {
      "email": "abc@example.com",
      "password": "Password123!",
      "display_name": "ABC"
    }
    ```

- **Login**
  - Method/URL: `POST /auth/login`
  - Auth: none
  - JSON body:
    ```json
    {
      "email": "abc@example.com",
      "password": "Password123!"
    }
    ```
  - Response contains a `token` field. For all protected endpoints, send this in the header:
    - `Authorization: Bearer <token>`

- **Me**
  - Method/URL: `GET /auth/me`
  - Auth: `Authorization: Bearer <token>`

### Posts

- **Create post**
  - Method/URL: `POST /posts`
  - Auth: `Bearer <token>`
  - JSON body:
    ```json
    { "content": "Hello world!" }
    ```

- **List posts (feed)**
  - Method/URL: `GET /posts`
  - Auth: `Bearer <token>`

- **Delete post**
  - Method/URL: `DELETE /posts/:id`
  - Auth: `Bearer <token>`
  - Rules: user can delete own posts; admins/owners can delete any post.

- **Like / Unlike post**
  - Like: `POST /posts/:id/like`
  - Unlike: `DELETE /posts/:id/like`
  - Auth: `Bearer <token>`

### Social (follow & block)

- **Follow user**
  - Method/URL: `POST /social/follow/:userId`
  - Auth: `Bearer <token>`

- **Block user**
  - Method/URL: `POST /social/block/:userId`
  - Auth: `Bearer <token>`
  - Effect: both users stop seeing each others posts in `/posts`.

### Admin / Owner

For these endpoints the callers JWT must have `role` = `ADMIN` or `OWNER` (and some are OWNER-only):

- Promote user to admin (OWNER only): `POST /admin/admins/:userId`
- Demote admin to user (OWNER only): `DELETE /admin/admins/:userId`
- Delete user (ADMIN/OWNER): `DELETE /admin/users/:userId`
- Delete post (ADMIN/OWNER): `DELETE /admin/posts/:postId`
- Delete like (ADMIN/OWNER): `DELETE /admin/likes/:userId/:postId`

### Activity wall

- **Get global activity feed**
  - Method/URL: `GET /activities`
  - Auth: `Bearer <token>`
  - Shows entries like:
    - `"ABC made a post"`
    - `"DEF followed ABC"`
    - `"PQR liked ABC's post"`
    - `"User deleted by 'Owner'"`
    - `"Post deleted by 'Admin'"`

---

## Tech Stack

I kept the stack simple on purpose so the focus is on the API design and permissions:

- Node.js + Express (CommonJS)
- PostgreSQL (Neon) via `pg`
- JWT (`jsonwebtoken`)
- Password hashing (`bcrypt`)

---

## Implementation notes

At a high level, I modelled the core entities as:

- `users`: basic profile + `role` (`USER`/`ADMIN`/`OWNER`).
- `posts`: authored by a user, soft-deletable with `deleted`, `deleted_by`, `deleted_at`.
- `likes`: many-to-many between users and posts.
- `follows`: who follows whom.
- `blocks`: who has blocked whom (used to filter posts from the feed both ways).
- `activities`: append-only log that captures human-readable descriptions of actions.

Every time an important action happens (create post, like, follow, admin delete, etc.) I call a small helper in `src/utils/activities.js` to record an activity row. The global activity wall simply reads from this table in reverse chronological order.

Role checks (`USER`/`ADMIN`/`OWNER`) are enforced in middleware (`src/middleware/auth.js`) and in the admin routes. Normal users can manage their own content, while admins/owners can moderate everything. Owners have a couple of extra endpoints to promote/demote admins.

---

## Getting Started (Local)

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
PORT=4000
DATABASE_URL="postgresql://<user>:<password>@<host>/<db_name>?sslmode=require"
JWT_SECRET="<long-random-hex>"
JWT_EXPIRES_IN="7d"
```

- `DATABASE_URL` – your PostgreSQL/Neon connection string.
- `JWT_SECRET` – generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

> **Note**: `.env` is intentionally not committed. Only `.env.example` / README show the shape.

### 3. Apply database schema

Open `schema.sql` and run its contents in your Postgres/Neon database (e.g. via Neon SQL editor):

```sql
\i schema.sql
```

This creates tables for `users`, `posts`, `likes`, `follows`, `blocks`, and `activities`.

### 4. Run the server

```bash
npm start
```

Health check:

```bash
GET http://localhost:4000/health
```

Should return:

```json
{ "status": "ok" }
```

---

## Postman Collection

A ready-to-import Postman collection is provided:

- File: `postman_collection.json`

### Import steps

1. Open Postman → **Import**.
2. Choose **File** and select `postman_collection.json` from the repo.
3. After import, set collection variables:
   - `base_url` = `http://localhost:4000`
   - `auth_token` – left empty; will be set by the Login request.
   - `user_id` / `post_id` – used by some admin/social requests.

### Typical flow in Postman

1. **Signup / Login**
   - Use `Auth → Signup` or `Auth → Login`.
   - The login request has a Postman test that stores `token` into the `auth_token` collection variable.
2. **Me**
   - `Auth → Me` uses `Bearer {{auth_token}}` automatically.
3. **Posts**
   - `Posts → Create post` to create content.
   - `Posts → List posts (feed)` to view the global feed (with block rules).
   - `Posts → Like post` / `Unlike post` using `{{post_id}}`.
4. **Social**
   - `Social (follow & block) → Follow user` / `Block user` using `{{user_id}}`.
5. **Admin / Owner**
   - Promote one user to OWNER directly in DB:
     ```sql
     UPDATE users SET role = 'OWNER' WHERE email = 'owner@example.com';
     ```
   - As OWNER, use `Admin / Owner → Promote user to admin (OWNER)` and other admin endpoints.
6. **Activities**
   - `Activities → Activity wall` to see all activities (post created, followed, liked, deletions).

---

## API Reference

A detailed endpoint-by-endpoint description (methods, URLs, auth, sample request/response bodies) is provided in:

- `API_DOCS.md`

This document maps directly to the Postman collection and the problem statement examples.

---

## Notes for Reviewers

- All role/permission checks are enforced in middleware and routes.
- Blocking is symmetric for feed visibility: if A blocks B, posts from A and B are hidden from each other in `/posts`.
- Activity logging is centralized in `src/utils/activities.js` and called from routes whenever a relevant action occurs.
- Admin/Owner destructive operations also create activities so they are visible on the global wall.
