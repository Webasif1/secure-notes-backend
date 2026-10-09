# SecureNotes API

REST API for a secure note-taking app, with JWT authentication, role-based access control (user / admin), paginated lists, MongoDB indexes and aggregation pipelines.

**Stack:** Node.js · Express 5 · MongoDB · Mongoose · JWT · bcrypt

- Frontend repo: `secure-notes-frontend`
- Live API: _add your Render URL here_

---

## Features

| Role | Can do |
|---|---|
| **User** | Register / log in, create, update, delete and list **own** notes, write public posts, edit own profile & interests |
| **Admin** | Everything a user can, plus **manage users** (list, add, update, remove) and **view everyone's notes** |

- Passwords hashed with **bcrypt** (12 rounds), never returned by the API (`select: false` + `toJSON` transform).
- **JWT** in `Authorization: Bearer <token>`. The user is reloaded on every request, so a deleted user or a changed role takes effect immediately.
- Public sign-up always creates a `user`. Admins are created by another admin or with `npm run seed:admin`.
- Input validation with **zod**, `mongoose.set('sanitizeFilter', true)` against NoSQL injection, **helmet**, CORS allow-list, rate limit on login/register.
- **Pagination** on every list endpoint: `?page=1&limit=10` (max 100).

---

## Indexing strategy

All indexes are declared with `schema.index()` in `src/models/`. Only indexes that a real query needs are created. Anything that filters or sorts by `_id` uses MongoDB's built-in `_id` index, so no extra index is added for it.

| Collection | Index | Used by |
|---|---|---|
| users | `{ email: 1 }` **unique** | Login / register lookup by email, and one account per email |
| users | `{ interests: 1 }` (multikey) | Scenario 1: `$match` stage of the group-by-interests aggregation |
| notes | `{ owner: 1, _id: -1 }` | "My notes" list (filter by owner + newest first + pagination + count), admin "notes of one user", deleting a user's notes |
| posts | `{ author: 1, _id: -1 }` | Scenario 2: `$lookup` posts by author newest first, deleting a user's posts |
| *(built-in)* | `{ _id: 1 }` | Get user / note / post by id, admin "all users", admin "all notes", public posts feed (all sorted by `_id`) |

**Why sort by `_id` instead of `createdAt`?** ObjectIds grow over time, so `_id: -1` already means "newest first". It is also unique, so pagination is stable without a tie-breaker. That avoids a separate `createdAt` index.

**Why `{ owner: 1, _id: -1 }` and not just `{ owner: 1 }`?** With equality on `owner` followed by the sort key, MongoDB reads the notes already in the right order and stops after `limit` documents. With `{ owner: 1 }` alone it would have to load all of that user's notes and sort them in memory.

### Proof

`npm run check:indexes` prints every index and the query plan of each query:

```
users: {"_id":1}  {"email":1}  {"interests":1}
notes: {"_id":1}  {"owner":1,"_id":-1}
posts: {"_id":1}  {"author":1,"_id":-1}

login (users by email)           PROJECTION_SIMPLE <- FETCH <- IXSCAN(email_1)
admin list users                 LIMIT <- PROJECTION_SIMPLE <- FETCH <- IXSCAN(_id_)
user by id                       EXPRESS_IXSCAN(_id_)
my notes                         LIMIT <- FETCH <- IXSCAN(owner_1__id_-1)
admin all notes                  LIMIT <- FETCH <- IXSCAN(_id_)
note by id + owner               FETCH <- IXSCAN(_id_)
posts feed                       LIMIT <- FETCH <- IXSCAN(_id_)
posts of user ($lookup side)     LIMIT <- FETCH <- IXSCAN(author_1__id_-1)
interests aggregation $match     PROJECTION_SIMPLE <- FETCH <- IXSCAN(interests_1)
```

No `COLLSCAN` and no in-memory `SORT` stage. `explain('executionStats')` on the scenario 2 pipeline also reports `indexesUsed: ['author_1__id_-1']` and `collectionScans: 0` for the `$lookup`.

---

## Aggregation tasks

### Scenario 1: users grouped by interests
`GET /api/users/interests` → `src/controllers/userController.js` → `groupByInterests`

Exactly **one** `User.aggregate()` call:

1. `$match { interests: { $type: 'string' } }`: users with at least one interest. Uses the `{ interests: 1 }` multikey index, so users without interests are never read.
2. `$project` keeps only `name` and `interests`.
3. `$unwind` creates one document per (user, interest).
4. `$group` by interest, collecting the users.
5. `$project` / `$sort`: most popular interest first.
6. `$facet` returns the requested page **and** the total count in the same call.

```json
{ "data": [ { "interest": "chess", "count": 3, "users": [ { "_id": "...", "name": "Ali" } ] } ],
  "meta": { "page": 1, "limit": 10, "total": 3, "totalPages": 1 } }
```

### Scenario 2: all posts of a user (`$lookup`)
`GET /api/posts/user/:userId` → `src/controllers/postController.js` → `postsByUser`

One pipeline on `users`:

1. `$match { _id }`: built-in `_id` index.
2. `$lookup` from `posts` with `localField: '_id'`, `foreignField: 'author'` and a sub-pipeline `$sort { _id: -1 }`, `$skip`, `$limit`. It uses the `{ author: 1, _id: -1 }` index.
3. It fetches `limit + 1` posts to compute `hasNextPage` without an extra count query.

---

## API reference

Base URL: `/api`. Every response looks like `{ success, data, meta? }` or `{ success: false, message, details? }`.

### Auth
| Method | Path | Access | Body |
|---|---|---|---|
| POST | `/auth/register` | public | `{ name, email, password, interests? }` |
| POST | `/auth/login` | public | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | logged in | |
| PATCH | `/auth/me` | logged in | `{ name?, interests?, password? }` |

### Notes
| Method | Path | Access |
|---|---|---|
| GET | `/notes?page&limit` | logged in: own notes |
| GET | `/notes/all?page&limit&owner?` | admin: everyone's notes |
| POST | `/notes` | logged in: `{ title, content? }` |
| GET | `/notes/:id` | owner or admin |
| PATCH | `/notes/:id` | owner |
| DELETE | `/notes/:id` | owner |

### Users
| Method | Path | Access |
|---|---|---|
| GET | `/users/interests?page&limit` | logged in (Scenario 1) |
| GET | `/users?page&limit` | admin |
| POST | `/users` | admin: `{ name, email, password, role?, interests? }` |
| GET | `/users/:id` | admin |
| PATCH | `/users/:id` | admin |
| DELETE | `/users/:id` | admin (also deletes the user's notes and posts) |

### Posts (public)
| Method | Path | Access |
|---|---|---|
| GET | `/posts?page&limit` | public feed |
| GET | `/posts/user/:userId?page&limit` | public (Scenario 2) |
| GET | `/posts/:id` | public |
| POST | `/posts` | logged in: `{ title, body }` |
| DELETE | `/posts/:id` | author or admin |

---

## Run locally

Requires Node.js 20+ and MongoDB (local or a free MongoDB Atlas cluster).

```bash
git clone <this repo>
cd secure-notes-backend
npm install
cp .env.example .env        # then edit MONGO_URI and JWT_SECRET
npm run seed:admin          # creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                 # http://localhost:5000
npm run check:indexes       # optional: print indexes + query plans
```

## Deploy (Render, free tier)

1. Create a free **MongoDB Atlas** cluster, a database user, and allow network access from `0.0.0.0/0`. Copy the connection string.
2. On Render: **New → Blueprint** → select this repo (uses `render.yaml`), or **New → Web Service** with build `npm ci` and start `npm start`.
3. Set the env vars `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL` (your frontend URL, e.g. `https://secure-notes.vercel.app`).
4. Run `npm run seed:admin` locally with `MONGO_URI` pointing to Atlas to create the admin.

## Project structure

```
src/
  config/       env + database connection
  models/       User, Note, Post (+ schema.index definitions)
  middleware/   authenticate / authorize, error handler
  controllers/  auth, notes, users (+ Scenario 1), posts (+ Scenario 2)
  routes/       Express routers
  utils/        pagination, validation, JWT, errors
  scripts/      seedAdmin, checkIndexes
```
