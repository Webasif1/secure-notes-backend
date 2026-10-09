import noteModel from "../models/note.models.js";
import { getPagination, paginationInfo } from "../utils/pagination.js";
import { searchRegex } from "../utils/search.js";

// ?search= looks in title and content
function addSearch(filter, search) {
  const regex = searchRegex(search);
  if (regex) filter.$or = [{ title: regex }, { content: regex }];
  return filter;
}

async function findNotes(filter, query) {
  const pagination = getPagination(query);

  const [notes, total] = await Promise.all([
    noteModel
      .find(filter)
      .sort({ _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("owner", "name email"),
    Object.keys(filter).length
      ? noteModel.countDocuments(filter)
      : noteModel.estimatedDocumentCount(),
  ]);

  return { notes, pagination: paginationInfo(pagination, total) };
}

/**
 * my notes, optional ?search=
 * index: { owner: 1, _id: -1 }
 * with search mongo still walks only this user's notes on the owner index
 * and checks the text on them, so no extra (text) index is needed
 */
export async function getMyNotes(req, res) {
  try {
    const { notes, pagination } = await findNotes(
      addSearch({ owner: req.user._id }, req.query.search),
      req.query,
    );

    return res.status(200).json({
      message: "Notes fetched successfully",
      success: true,
      notes,
      pagination,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * admin: everyone's notes, can filter with ?owner=userId and ?search=
 * no filter -> _id index, with owner -> { owner: 1, _id: -1 } index
 */
export async function getAllNotes(req, res) {
  try {
    const filter = addSearch(
      req.query.owner ? { owner: req.query.owner } : {},
      req.query.search,
    );
    const { notes, pagination } = await findNotes(filter, req.query);

    return res.status(200).json({
      message: "All notes fetched successfully",
      success: true,
      notes,
      pagination,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// owner can see his note, admin can see any note
export async function getSingleNote(req, res) {
  const { id } = req.params;

  try {
    const filter =
      req.user.role === "admin" ? { _id: id } : { _id: id, owner: req.user._id };
    const note = await noteModel.findOne(filter).populate("owner", "name email");

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
        success: false,
        error: "Not found",
      });
    }

    return res.status(200).json({
      message: "Note fetched successfully",
      success: true,
      note,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createNote(req, res) {
  const { title, content } = req.body;

  try {
    const note = await noteModel.create({
      title,
      content,
      owner: req.user._id,
    });

    return res.status(201).json({
      message: "Note created successfully",
      success: true,
      note,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// only the owner can update
export async function updateNote(req, res) {
  const { id } = req.params;
  const { title, content } = req.body;

  try {
    const update = {};
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = content;

    const note = await noteModel.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      update,
      { new: true, runValidators: true },
    );

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
        success: false,
        error: "Not found",
      });
    }

    return res.status(200).json({
      message: "Note updated successfully",
      success: true,
      note,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// only the owner can delete
export async function deleteNote(req, res) {
  const { id } = req.params;

  try {
    const note = await noteModel.findOneAndDelete({
      _id: id,
      owner: req.user._id,
    });

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
        success: false,
        error: "Not found",
      });
    }

    return res.status(200).json({
      message: "Note deleted successfully",
      success: true,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
