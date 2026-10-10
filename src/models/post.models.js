import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Author is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    body: {
      type: String,
      required: [true, "Body is required"],
    },
  },
  { timestamps: true },
);

/**
 * Indexes
 *
 * { author: 1, _id: -1 }
 *  - the $lookup in "posts of a user" joins posts on author and sorts
 *    them newest first, this one index covers both
 *  - deleteMany({ author }) when admin deletes a user
 *
 * No other index needed:
 *  - all posts feed (sorted by _id) uses the _id index
 */
postSchema.index({ author: 1, _id: -1 });

const postModel = mongoose.model("post", postSchema);

export default postModel;
