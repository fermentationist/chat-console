import express from "express";
import cors from "cors";

const app = express();

// enable cors
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static files from client directory
app.use(express.static("client"));

// default route
app.get("/", (req, res) => {
  return res.sendFile("../client/index.html");
});

export default app;
