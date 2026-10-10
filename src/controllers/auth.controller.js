import userModel from "../models/user.models.js";
import { sendTokenResponse } from "../utils/token.js";

export async function registerController(req, res) {
  const { name, email, password, interests } = req.body;

  try {
    // uses { email: 1 } index
    const isUserAlreadyExist = await userModel.findOne({ email });

    if (isUserAlreadyExist) {
      return res.status(409).json({
        message: "User already exist with this email",
        success: false,
        error: "User already exist",
      });
    }

    // role is always "user" on register, only admin can make another admin
    const user = await userModel.create({
      name,
      email,
      password,
      interests,
      role: "user",
    });

    return sendTokenResponse(user, res, 201, "User registered successfully");
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function loginController(req, res) {
  const { email, password } = req.body;

  try {
    // uses { email: 1 } index
    const user = await userModel
      .findOne({ email: email.toLowerCase() })
      .select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        message: "Invalid email or password",
        success: false,
        error: "Invalid credentials",
      });
    }

    return sendTokenResponse(user, res, 200, "User logged in successfully");
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function logoutController(req, res) {
  res.clearCookie("token");
  return res.status(200).json({
    message: "User logged out successfully",
    success: true,
  });
}

export async function getMeController(req, res) {
  return res.status(200).json({
    message: "Successfully user fetched",
    success: true,
    user: req.user,
  });
}
