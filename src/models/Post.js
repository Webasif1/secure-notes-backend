import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 20000 },
  },
  { timestamps: true }
);

/*
 * Indexes:
 *
 * 1. { author: 1, _id: -1 }
 *    - Scenario 2: the $lookup from users joins on posts.author and then
 *      sorts that user's posts newest first. Equality on author + sort on
 *      _id are both served by this one index.
 *    - Deleting all posts of a removed user (deleteMany({ author })).
 *
 * Not needed (covered by the built-in _id index):
 *    - Public feed of all posts: sorted by _id with no filter.
 *    - GET / DELETE a single post by _id.
 */
postSchema.index({ author: 1, _id: -1 });

postSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Post = mongoose.model('Post', postSchema);
