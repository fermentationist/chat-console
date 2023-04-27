import "dotenv/config";
import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("client"));

app.get("/", (req, res) => {
  return res.sendFile("../client/index.html");
});

export default app;
