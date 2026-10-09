import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: '', maxlength: 20000 },
  },
  { timestamps: true }
);

/*
 * Indexes:
 *
 * 1. { owner: 1, _id: -1 }
 *    - "List my notes": filter { owner } + sort { _id: -1 } + skip/limit.
 *      Equality on owner, then the sort key, so MongoDB walks the index in
 *      order and never sorts in memory. Also used by countDocuments({ owner }).
 *    - Admin "list notes of one user" (?owner=...) uses the same index.
 *    - Deleting all notes of a removed user (deleteMany({ owner })).
 *
 * Not needed (covered by the built-in _id index):
 *    - GET / PATCH / DELETE a single note: query is { _id } or { _id, owner };
 *      _id is unique, so the _id index finds it directly.
 *    - Admin "list everyone's notes": sorted by _id with no filter.
 *
 * _id is used as the sort key instead of createdAt because ObjectIds grow
 * over time, so newest-first by _id == newest-first by creation date, and
 * it is unique (stable pagination with no tie-breaker field).
 */
noteSchema.index({ owner: 1, _id: -1 });

noteSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Note = mongoose.model('Note', noteSchema);
