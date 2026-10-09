import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js";
import noteRouter from "./routes/note.routes.js";
import userRouter from "./routes/user.routes.js";
import postRouter from "./routes/post.routes.js";
import { config } from "./config/config.js";

const app = express();

app.set("trust proxy", 1);
app.use(morgan("dev"));
app.use(
  cors({
    origin: config.CLIENT_URL.split(",").map((url) => url.trim()),
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.send("The server is ok");
});

app.use("/api/auth", authRouter);
app.use("/api/notes", noteRouter);
app.use("/api/users", userRouter);
app.use("/api/posts", postRouter);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    success: false,
    error: "Not found",
  });
});

export default app;
