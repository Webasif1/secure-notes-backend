import userModel from "../models/user.models.js";
import noteModel from "../models/note.models.js";
import postModel from "../models/post.models.js";
import { getPagination, paginationInfo } from "../utils/pagination.js";
import { searchRegex } from "../utils/search.js";

// admin: all users, newest first (default _id index), optional ?search= on name/email
export async function getAllUsers(req, res) {
  const pagination = getPagination(req.query);
  const regex = searchRegex(req.query.search);
  const filter = regex ? { $or: [{ name: regex }, { email: regex }] } : {};

  try {
    const [users, total] = await Promise.all([
      userModel
        .find(filter)
        .sort({ _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      regex
        ? userModel.countDocuments(filter)
        : userModel.estimatedDocumentCount(),
    ]);

    return res.status(200).json({
      message: "Users fetched successfully",
      success: true,
      users,
      pagination: paginationInfo(pagination, total),
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getSingleUser(req, res) {
  try {
    const user = await userModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
        error: "Not found",
      });
    }

    return res.status(200).json({
      message: "User fetched successfully",
      success: true,
      user,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// admin can add a user or another admin
export async function createUser(req, res) {
  const { name, email, password, role, interests } = req.body;

  try {
    const isUserAlreadyExist = await userModel.findOne({ email });
    if (isUserAlreadyExist) {
      return res.status(409).json({
        message: "User already exist with this email",
        success: false,
        error: "User already exist",
      });
    }

    const user = await userModel.create({
      name,
      email,
      password,
      role,
      interests,
    });

    const newUser = user.toObject();
    delete newUser.password;

    return res.status(201).json({
      message: "User created successfully",
      success: true,
      user: newUser,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email, password, role, interests } = req.body;

  try {
    if (id === req.user._id.toString() && role && role !== "admin") {
      return res.status(400).json({
        message: "You can not remove your own admin role",
        success: false,
        error: "Bad request",
      });
    }

    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
        error: "Not found",
      });
    }

    if (email !== undefined && email.toLowerCase() !== user.email) {
      const emailTaken = await userModel.findOne({ email: email.toLowerCase() });
      if (emailTaken) {
        return res.status(409).json({
          message: "User already exist with this email",
          success: false,
          error: "User already exist",
        });
      }
      user.email = email;
    }
    if (name !== undefined) user.name = name;
    if (password !== undefined) user.password = password;
    if (role !== undefined) user.role = role;
    if (interests !== undefined) user.interests = interests;

    // save() so a new password gets hashed
    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    return res.status(200).json({
      message: "User updated successfully",
      success: true,
      user: updatedUser,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// also deletes the user's notes and posts
export async function deleteUser(req, res) {
  const { id } = req.params;

  try {
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        message: "You can not delete your own account",
        success: false,
        error: "Bad request",
      });
    }

    const user = await userModel.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
        error: "Not found",
      });
    }

    // both use the { owner / author: 1, _id: -1 } index
    await Promise.all([
      noteModel.deleteMany({ owner: user._id }),
      postModel.deleteMany({ author: user._id }),
    ]);

    return res.status(200).json({
      message: "User deleted successfully",
      success: true,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Scenario 1: users grouped by interests
 * only ONE collection.aggregate() call
 *
 * 1. $match   users that have at least one interest
 *             ($type "string" on an array = any element is a string)
 *             this runs on the { interests: 1 } index
 * 2. $project keep only name and interests
 * 3. $unwind  one doc for each (user, interest)
 * 4. $group   group by interest and collect the users
 * 5. $sort    most popular interest first
 * 6. $facet   page of groups + total count in the same call (pagination)
 */
export async function getUsersByInterests(req, res) {
  const pagination = getPagination(req.query);

  try {
    const [result] = await userModel.aggregate([
      { $match: { interests: { $type: "string" } } },
      { $project: { name: 1, interests: 1 } },
      { $unwind: "$interests" },
      {
        $group: {
          _id: "$interests",
          users: { $addToSet: { _id: "$_id", name: "$name" } },
        },
      },
      {
        $project: {
          _id: 0,
          interest: "$_id",
          users: 1,
          count: { $size: "$users" },
        },
      },
      { $sort: { count: -1, interest: 1 } },
      {
        $facet: {
          groups: [{ $skip: pagination.skip }, { $limit: pagination.limit }],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const total = result.total[0] ? result.total[0].count : 0;

    return res.status(200).json({
      message: "Users grouped by interests",
      success: true,
      groups: result.groups,
      pagination: paginationInfo(pagination, total),
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
