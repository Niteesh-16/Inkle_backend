# Social Activity Feed API Documentation

## Overview

- **Base URL (local)**: `http://localhost:4000`
- **Auth**: JWT via `Authorization: Bearer <token>`
- **Roles**:
  - `USER` – normal user (default)
  - `ADMIN` – can delete any user/post/like
  - `OWNER` – can do everything an admin can and manage admins

This document corresponds to the Postman collection in `postman_collection.json`.

---

## Auth & Profile

### 1. Signup

- **Method**: `POST`
- **URL**: `/auth/signup`
- **Auth**: None
- **Body (JSON)**:
  ```json
  {
    "email": "abc@example.com",
    "password": "Password123!",
    "display_name": "ABC"
  }
  ```
- **Responses**:
  - **201 Created**
    ```json
    {
      "token": "JWT_TOKEN_HERE",
      "user": {
        "id": 1,
        "email": "abc@example.com",
        "display_name": "ABC",
        "role": "USER"
      }
    }
    ```
  - **409 Conflict** – email already registered
  - **400 Bad Request** – missing fields

### 2. Login

- **Method**: `POST`
- **URL**: `/auth/login`
- **Auth**: None
- **Body (JSON)**:
  ```json
  {
    "email": "abc@example.com",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - **200 OK**
    ```json
    {
      "token": "JWT_TOKEN_HERE",
      "user": {
        "id": 1,
        "email": "abc@example.com",
        "display_name": "ABC",
        "role": "USER"
      }
    }
    ```
  - **401 Unauthorized** – invalid credentials

### 3. Get my profile

- **Method**: `GET`
- **URL**: `/auth/me`
- **Auth**: Required (`Bearer <token>`)
- **Responses**:
  - **200 OK**
    ```json
    {
      "id": 1,
      "email": "abc@example.com",
      "display_name": "ABC",
      "role": "USER",
      "created_at": "2025-11-22T10:00:00.000Z"
    }
    ```
  - **401 Unauthorized** – missing/invalid token

---

## Posts

### 4. Create post

- **Method**: `POST`
- **URL**: `/posts`
- **Auth**: Required (`USER` / `ADMIN` / `OWNER`)
- **Body (JSON)**:
  ```json
  { "content": "Hello world!" }
  ```
- **Responses**:
  - **201 Created**
    ```json
    {
      "id": 10,
      "user_id": 1,
      "content": "Hello world!",
      "created_at": "2025-11-22T10:10:00.000Z"
    }
    ```
- **Side effects**:
  - Adds `POST_CREATED` activity (e.g. `"ABC made a post"`).

### 5. Get global posts feed (with blocking rules)

- **Method**: `GET`
- **URL**: `/posts`
- **Auth**: Required
- **Behavior**:
  - Returns all **non-deleted** posts.
  - Excludes posts if:
    - current user blocked the author, or
    - author blocked current user.
- **Response (200)**:
  ```json
  [
    {
      "id": 10,
      "user_id": 1,
      "display_name": "ABC",
      "content": "Hello world!",
      "created_at": "2025-11-22T10:10:00.000Z"
    }
  ]
  ```

### 6. Delete post (self or admin/owner)

- **Method**: `DELETE`
- **URL**: `/posts/:id`
- **Auth**: Required
- **Permissions**:
  - `USER`: can delete **only own** posts.
  - `ADMIN` / `OWNER`: can delete **any** post.
- **Responses**:
  - **200 OK**
    ```json
    { "message": "Post deleted" }
    ```
  - **403 Forbidden** – normal user deleting someone elses post
  - **404 Not Found** – post id invalid
- **Side effects**:
  - Adds `POST_DELETED` activity:
    - `"ABC deleted their post"` (self)
    - `"Post deleted by 'ADMIN'"` or `"Post deleted by 'OWNER'"`.

### 7. Like a post

- **Method**: `POST`
- **URL**: `/posts/:id/like`
- **Auth**: Required
- **Responses**:
  - **201 Created**
    ```json
    { "message": "Post liked" }
    ```
  - Idempotent: liking again does not error.
- **Side effects**:
  - Adds `LIKED_POST` activity (e.g. `"PQR liked a post"`).

### 8. Unlike a post

- **Method**: `DELETE`
- **URL**: `/posts/:id/like`
- **Auth**: Required
- **Responses**:
  - **200 OK**
    ```json
    { "message": "Like removed" }
    ```

---

## Social: Follow & Block

### 9. Follow user

- **Method**: `POST`
- **URL**: `/social/follow/:id`
- **Auth**: Required
- **Rules**:
  - Cannot follow yourself.
- **Response**:
  - **201 Created**
    ```json
    { "message": "Now following user" }
    ```
- **Side effects**:
  - Adds `FOLLOWED` activity:
    - e.g. `"DEF followed ABC"`.

### 10. Unfollow user

- **Method**: `DELETE`
- **URL**: `/social/follow/:id`
- **Auth**: Required
- **Response**:
  - **200 OK**
    ```json
    { "message": "Unfollowed user" }
    ```

### 11. Block user

- **Method**: `POST`
- **URL**: `/social/block/:id`
- **Auth**: Required
- **Rules**:
  - Cannot block yourself.
  - When A blocks B:
    - A does not see Bs posts.
    - B does not see As posts.
- **Response**:
  - **201 Created**
    ```json
    { "message": "User blocked" }
    ```

### 12. Unblock user

- **Method**: `DELETE`
- **URL**: `/social/block/:id`
- **Auth**: Required
- **Response**:
  - **200 OK**
    ```json
    { "message": "User unblocked" }
    ```

---

## Admin / Owner Features

> To create the first `OWNER`, update directly in the DB:
> ```sql
> UPDATE users SET role = 'OWNER' WHERE email = 'owner@example.com';
> ```

### 13. Promote user to admin (OWNER only)

- **Method**: `POST`
- **URL**: `/admin/admins/:id`
- **Auth**: Required (`role = OWNER`)
- **Response**:
  - **200 OK**
    ```json
    { "message": "User promoted to admin" }
    ```
  - **403 Forbidden** – caller not OWNER

### 14. Demote admin to user (OWNER only)

- **Method**: `DELETE`
- **URL**: `/admin/admins/:id`
- **Auth**: Required (`role = OWNER`)
- **Response**:
  - **200 OK**
    ```json
    { "message": "Admin demoted to user" }
    ```

### 15. Delete user (ADMIN / OWNER)

- **Method**: `DELETE`
- **URL**: `/admin/users/:id`
- **Auth**: Required (`role = ADMIN or OWNER`)
- **Responses**:
  - **200 OK**
    ```json
    { "message": "User deleted" }
    ```
  - **404 Not Found** – user id doesnt exist
- **Side effects**:
  - Adds `USER_DELETED` activity:
    - `"User deleted by 'Owner'"` or `"User deleted by 'Admin'"`.

### 16. Delete post (ADMIN / OWNER)

- **Method**: `DELETE`
- **URL**: `/admin/posts/:id`
- **Auth**: Required (`ADMIN` / `OWNER`)
- **Behavior**:
  - Soft-deletes post (sets `deleted = true`, records `deleted_by`, `deleted_at`).
- **Responses**:
  - **200 OK**
    ```json
    { "message": "Post deleted by admin/owner" }
    ```
- **Side effects**:
  - Adds `POST_DELETED` activity:
    - `"Post deleted by 'ADMIN'"` or `"Post deleted by 'OWNER'"`.

### 17. Delete a like (ADMIN / OWNER)

- **Method**: `DELETE`
- **URL**: `/admin/likes/:userId/:postId`
- **Auth**: Required (`ADMIN` / `OWNER`)
- **Responses**:
  - **200 OK**
    ```json
    { "message": "Like deleted by admin/owner" }
    ```

---

## Activity Wall

### 18. Global activity feed

- **Method**: `GET`
- **URL**: `/activities`
- **Auth**: Required
- **Behavior**:
  - Returns the 100 most recent activities across the whole network.
  - Each activity captures:
    - Actor (who did it).
    - Optional target user.
    - Optional post.
    - Human-readable description.
- **Response (200)**:
  ```json
  [
    {
      "id": 1,
      "type": "POST_CREATED",
      "description": "ABC made a post",
      "created_at": "2025-11-22T10:10:00.000Z",
      "actor_id": 1,
      "actor_name": "ABC",
      "target_user_id": null,
      "target_name": null,
      "post_id": 10
    },
    {
      "id": 2,
      "type": "FOLLOWED",
      "description": "DEF followed ABC",
      "created_at": "2025-11-22T10:12:00.000Z",
      "actor_id": 2,
      "actor_name": "DEF",
      "target_user_id": 1,
      "target_name": "ABC",
      "post_id": null
    },
    {
      "id": 3,
      "type": "USER_DELETED",
      "description": "User deleted by 'Owner'",
      "created_at": "2025-11-22T10:20:00.000Z",
      "actor_id": 3,
      "actor_name": "OWNER_USER",
      "target_user_id": 4,
      "target_name": "Deleted User",
      "post_id": null
    }
  ]
  ```

### Mapping to problem statement examples

- `"ABC made a post"` → `POST_CREATED`
- `"DEF followed ABC"` → `FOLLOWED`
- `"PQR liked ABC's post"` → `LIKED_POST` (post id refers to ABCs post)
- `"User deleted by 'Owner'"` → `USER_DELETED` with actor role OWNER
- `"Post deleted by 'Admin'"` → `POST_DELETED` with actor role ADMIN

---

## Quick Reviewer Test Flow

1. **Auth**
   - `POST /auth/signup` to create 23 users.
   - `POST /auth/login` to obtain JWT token.
   - `GET /auth/me` to verify role and identity.

2. **Core social**
   - User A: create a post → appears in `GET /posts`.
   - User B: like As post & follow A → visible in `GET /activities`.

3. **Blocking behavior**
   - User A blocks B via `POST /social/block/:id`.
   - User B no longer sees As posts in `GET /posts` and vice versa.

4. **Admin / Owner**
   - Promote one user to OWNER in DB.
   - OWNER promotes another user to ADMIN via `POST /admin/admins/:id`.
   - ADMIN deletes a user or post via `/admin/users/:id` or `/admin/posts/:id`.
   - Confirm corresponding activities in `GET /activities`.
