import { z } from 'zod';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { AppError, notFound } from '../utils/AppError.js';
import { parse, objectId, toObjectId } from '../utils/validate.js';
import { getPagination, buildMeta } from '../utils/pagination.js';

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
});

// GET /api/posts  (public feed, visible to everyone) -> default _id index
export async function listPosts(req, res) {
  const pagination = getPagination(req.query);
  const [posts, total] = await Promise.all([
    Post.find()
      .sort({ _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('author', 'name')
      .lean(),
    Post.estimatedDocumentCount(),
  ]);
  res.json({ success: true, data: posts, meta: buildMeta(pagination, total) });
}

// GET /api/posts/:id  (public) -> default _id index
export async function getPost(req, res) {
  const post = await Post.findById(parse(objectId, req.params.id)).populate('author', 'name').lean();
  if (!post) throw notFound('Post');
  res.json({ success: true, data: post });
}

// POST /api/posts  (logged in)
export async function createPost(req, res) {
  const data = parse(createSchema, req.body);
  const post = await Post.create({ ...data, author: req.user.id });
  res.status(201).json({ success: true, data: post });
}

// DELETE /api/posts/:id  -> author or admin
export async function deletePost(req, res) {
  const id = parse(objectId, req.params.id);
  const filter = req.user.role === 'admin' ? { _id: id } : { _id: id, author: req.user.id };
  const post = await Post.findOneAndDelete(filter);
  if (!post) throw notFound('Post');
  res.json({ success: true, message: 'Post deleted' });
}

/**
 * Scenario 2 - GET /api/posts/user/:userId
 * All posts of one user with a single aggregation pipeline using $lookup.
 *
 * 1. $match on users._id                -> built-in _id index.
 * 2. $lookup into posts on author == _id -> { author: 1, _id: -1 } index.
 *    The sub-pipeline sorts newest first (_id: -1) and paginates; because
 *    the index is { author, _id }, MongoDB reads exactly that user's posts
 *    already in order, with no in-memory sort.
 *    It fetches limit + 1 posts to know if there is a next page without a
 *    separate count query.
 */
export async function postsByUser(req, res) {
  const userId = toObjectId(req.params.userId);
  const pagination = getPagination(req.query);

  const [result] = await User.aggregate([
    { $match: { _id: userId } },
    {
      $lookup: {
        from: Post.collection.name,
        localField: '_id',
        foreignField: 'author',
        pipeline: [
          { $sort: { _id: -1 } },
          { $skip: pagination.skip },
          { $limit: pagination.limit + 1 },
          { $project: { __v: 0, author: 0 } },
        ],
        as: 'posts',
      },
    },
    { $project: { _id: 1, name: 1, posts: 1 } },
  ]);

  if (!result) throw new AppError(404, 'User not found');

  const hasNextPage = result.posts.length > pagination.limit;
  res.json({
    success: true,
    data: {
      user: { _id: result._id, name: result.name },
      posts: result.posts.slice(0, pagination.limit),
    },
    meta: { page: pagination.page, limit: pagination.limit, hasNextPage },
  });
}
