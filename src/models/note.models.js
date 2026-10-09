import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Owner is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

/**
 * Indexes
 *
 * { owner: 1, _id: -1 }
 *  - "my notes" list: find({ owner }).sort({ _id: -1 }).skip().limit()
 *    owner is the filter and _id is the sort, so mongo reads the notes
 *    already sorted and stops after "limit" docs (no in-memory sort)
 *  - countDocuments({ owner }) for pagination
 *  - admin notes of one user (?owner=) and deleteMany({ owner })
 *
 * No other index needed:
 *  - get / update / delete one note -> { _id } or { _id, owner }, _id index
 *  - admin all notes -> sorted by _id, _id index
 *
 * I sort by _id instead of createdAt because ObjectId already grows with
 * time (newest _id = newest note), so I don't need a createdAt index.
 */
noteSchema.index({ owner: 1, _id: -1 });

const noteModel = mongoose.model("note", noteSchema);

export default noteModel;
