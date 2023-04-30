import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();

// enable cors
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// serve static files from client directory
app.use(express.static("client"));

// default route
app.get("/", (req, res) => {
  return res.sendFile("../client/index.html");
});

export default app;
