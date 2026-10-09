import { z } from 'zod';
import { User, ROLES } from '../models/User.js';
import { Note } from '../models/Note.js';
import { Post } from '../models/Post.js';
import { AppError, notFound } from '../utils/AppError.js';
import { parse, objectId } from '../utils/validate.js';
import { getPagination, buildMeta } from '../utils/pagination.js';

const interests = z.array(z.string().trim().min(1).max(40)).max(20);

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  role: z.enum(ROLES).default('user'),
  interests: interests.optional(),
});

const updateSchema = createSchema.partial().strict();

// GET /api/users  (admin) -> paginated, newest first. Uses the default _id index.
export async function listUsers(req, res) {
  const pagination = getPagination(req.query);
  const [users, total] = await Promise.all([
    User.find().sort({ _id: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    User.estimatedDocumentCount(),
  ]);
  users.forEach((u) => delete u.__v);
  res.json({ success: true, data: users, meta: buildMeta(pagination, total) });
}

// GET /api/users/:id  (admin) -> default _id index
export async function getUser(req, res) {
  const user = await User.findById(parse(objectId, req.params.id));
  if (!user) throw notFound('User');
  res.json({ success: true, data: user });
}

// POST /api/users  (admin) -> can create users or other admins
export async function createUser(req, res) {
  const data = parse(createSchema, req.body);
  const user = await User.create(data);
  res.status(201).json({ success: true, data: user });
}

// PATCH /api/users/:id  (admin)
export async function updateUser(req, res) {
  const id = parse(objectId, req.params.id);
  const data = parse(updateSchema, req.body);
  if (id === req.user.id && data.role && data.role !== 'admin') {
    throw new AppError(400, 'You cannot remove your own admin role');
  }
  const user = await User.findById(id);
  if (!user) throw notFound('User');
  Object.assign(user, data);
  await user.save(); // save() so a new password gets hashed
  res.json({ success: true, data: user });
}

// DELETE /api/users/:id  (admin) -> also removes the user's notes and posts
export async function deleteUser(req, res) {
  const id = parse(objectId, req.params.id);
  if (id === req.user.id) throw new AppError(400, 'You cannot delete your own account');
  const user = await User.findByIdAndDelete(id);
  if (!user) throw notFound('User');
  // Both deletes use the { owner/author: 1, _id: -1 } indexes.
  await Promise.all([Note.deleteMany({ owner: user._id }), Post.deleteMany({ author: user._id })]);
  res.json({ success: true, message: 'User deleted' });
}

/**
 * Scenario 1 - GET /api/users/interests
 * Users grouped by interest, using exactly ONE collection.aggregate() call.
 *
 * 1. $match  { interests: { $type: 'string' } }
 *    On an array field this matches documents with at least one string
 *    element. It is answered by the multikey { interests: 1 } index
 *    (IXSCAN over the string range), so users without interests are
 *    never read.
 * 2. $unwind one document per (user, interest).
 * 3. $group  by interest, collecting the users.
 * 4. $sort   most popular interests first, then alphabetically.
 * 5. $facet  returns the page of groups and the total number of groups
 *            in the same single aggregate() call (pagination).
 */
export async function groupByInterests(req, res) {
  const pagination = getPagination(req.query);

  const [result] = await User.aggregate([
    { $match: { interests: { $type: 'string' } } },
    { $project: { name: 1, interests: 1 } },
    { $unwind: '$interests' },
    {
      $group: {
        _id: '$interests',
        users: { $addToSet: { _id: '$_id', name: '$name' } },
      },
    },
    { $project: { _id: 0, interest: '$_id', users: 1, count: { $size: '$users' } } },
    { $sort: { count: -1, interest: 1 } },
    {
      $facet: {
        data: [{ $skip: pagination.skip }, { $limit: pagination.limit }],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const total = result.total[0]?.count ?? 0;
  res.json({ success: true, data: result.data, meta: buildMeta(pagination, total) });
}
