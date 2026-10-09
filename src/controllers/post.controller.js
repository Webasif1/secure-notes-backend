import mongoose from "mongoose";
import postModel from "../models/post.models.js";
import userModel from "../models/user.models.js";
import { getPagination, paginationInfo } from "../utils/pagination.js";

// public feed, newest first (default _id index)
export async function getAllPosts(req, res) {
  const pagination = getPagination(req.query);

  try {
    const [posts, total] = await Promise.all([
      postModel
        .find()
        .sort({ _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .populate("author", "name"),
      postModel.estimatedDocumentCount(),
    ]);

    return res.status(200).json({
      message: "All posts fetched successfully",
      success: true,
      posts,
      pagination: paginationInfo(pagination, total),
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getSinglePost(req, res) {
  try {
    const post = await postModel
      .findById(req.params.id)
      .populate("author", "name");

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        success: false,
        error: "Not found",
      });
    }

    return res.status(200).json({
      message: "Post fetched successfully",
      success: true,
      post,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createPost(req, res) {
  const { title, body } = req.body;

  try {
    const post = await postModel.create({
      title,
      body,
      author: req.user._id,
    });

    return res.status(201).json({
      message: "Post created successfully",
      success: true,
      post,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// author or admin can delete
export async function deletePost(req, res) {
  const { id } = req.params;

  try {
    const filter =
      req.user.role === "admin" ? { _id: id } : { _id: id, author: req.user._id };
    const post = await postModel.findOneAndDelete(filter);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        success: false,
        error: "Not found",
      });
    }

    return res.status(200).json({
      message: "Post deleted successfully",
      success: true,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Scenario 2: all posts of one user
 * one aggregation pipeline with $lookup
 *
 * 1. $match  the user by _id -> default _id index
 * 2. $lookup posts where author = user _id -> { author: 1, _id: -1 } index
 *    inside the lookup: sort newest first + skip + limit (pagination)
 *    I take limit + 1 posts so I know if there is a next page
 *    without running another count query
 */
export async function getPostsByUser(req, res) {
  const pagination = getPagination(req.query);

  try {
    const [result] = await userModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.userId) } },
      {
        $lookup: {
          from: postModel.collection.name,
          localField: "_id",
          foreignField: "author",
          pipeline: [
            { $sort: { _id: -1 } },
            { $skip: pagination.skip },
            { $limit: pagination.limit + 1 },
            { $project: { __v: 0, author: 0 } },
          ],
          as: "posts",
        },
      },
      { $project: { _id: 1, name: 1, posts: 1 } },
    ]);

    if (!result) {
      return res.status(404).json({
        message: "User not found",
        success: false,
        error: "Not found",
      });
    }

    const hasNextPage = result.posts.length > pagination.limit;

    return res.status(200).json({
      message: "User posts fetched successfully",
      success: true,
      user: { _id: result._id, name: result.name },
      posts: result.posts.slice(0, pagination.limit),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        hasNextPage,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
