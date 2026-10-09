import { z } from 'zod';
import { Note } from '../models/Note.js';
import { notFound } from '../utils/AppError.js';
import { parse, objectId, toObjectId } from '../utils/validate.js';
import { getPagination, buildMeta } from '../utils/pagination.js';

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(20000).optional(),
});
const updateSchema = createSchema.partial().strict();

async function paginate(filter, query) {
  const pagination = getPagination(query);
  const [items, total] = await Promise.all([
    Note.find(filter)
      .sort({ _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('owner', 'name email')
      .lean(),
    Object.keys(filter).length ? Note.countDocuments(filter) : Note.estimatedDocumentCount(),
  ]);
  return { data: items, meta: buildMeta(pagination, total) };
}

// GET /api/notes  -> my notes. Index: { owner: 1, _id: -1 }
export async function listMyNotes(req, res) {
  const result = await paginate({ owner: toObjectId(req.user.id) }, req.query);
  res.json({ success: true, ...result });
}

// GET /api/notes/all  (admin) -> everyone's notes, optional ?owner=<userId>
// No filter: default _id index. With ?owner: { owner: 1, _id: -1 } index.
export async function listAllNotes(req, res) {
  const filter = req.query.owner ? { owner: toObjectId(req.query.owner) } : {};
  const result = await paginate(filter, req.query);
  res.json({ success: true, ...result });
}

// GET /api/notes/:id  -> owner can read their note, admin can read any note.
export async function getNote(req, res) {
  const id = parse(objectId, req.params.id);
  const filter = req.user.role === 'admin' ? { _id: id } : { _id: id, owner: req.user.id };
  const note = await Note.findOne(filter).populate('owner', 'name email').lean();
  if (!note) throw notFound('Note');
  res.json({ success: true, data: note });
}

// POST /api/notes
export async function createNote(req, res) {
  const data = parse(createSchema, req.body);
  const note = await Note.create({ ...data, owner: req.user.id });
  res.status(201).json({ success: true, data: note });
}

// PATCH /api/notes/:id  -> only the owner can edit
export async function updateNote(req, res) {
  const id = parse(objectId, req.params.id);
  const data = parse(updateSchema, req.body);
  const note = await Note.findOneAndUpdate({ _id: id, owner: req.user.id }, data, {
    new: true,
    runValidators: true,
  });
  if (!note) throw notFound('Note');
  res.json({ success: true, data: note });
}

// DELETE /api/notes/:id  -> only the owner can delete
export async function deleteNote(req, res) {
  const id = parse(objectId, req.params.id);
  const note = await Note.findOneAndDelete({ _id: id, owner: req.user.id });
  if (!note) throw notFound('Note');
  res.json({ success: true, message: 'Note deleted' });
}
