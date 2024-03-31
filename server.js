const express = require("express");
const fs = require("fs");
let ejs = require("ejs");
const bodyParser = require("body-parser");
const app = express();
const { connectDb } = require("./config/db");
const BlogModal = require("./models/blogModel");
const UserModal = require("./models/userModal");

const PORT = 5000;

connectDb();
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.set("view engine", "ejs");

app.use(express.static("upload"));

const multer = require("multer");

const cookieParser = require("cookie-parser");
app.use(cookieParser());

const auth = (req, res, next) => {
  if (!req.cookies.user) {
    res.redirect("/login");
  } else {
    next();
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    return cb(null, "./upload");
  },
  filename: (req, file, cb) => {
    return cb(null, Date.now() + file.originalname);
  },
});

var upload = multer({ storage: storage }).single("file");

app.get("/", async (req, res) => {
  const blog = await BlogModal.find({});
  res.render("pages/index", { blogs: blog, user: req.cookies.user });
});
app.get("/add", auth, (req, res) => {
  res.render("pages/add", { user: req.cookies.user });
});

app.post("/add", async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send("Error uploading file.");
    }
    if (req.file) {
      var details = {
        title: req.body.title,
        description: req.body.description,
        username: req.body.username,
        date: req.body.date,
        image: req.file.filename,
      };
      try {
        const blog = new BlogModal(details);
        const result = await blog.save();
        res.redirect("/");
      } catch (error) {
        console.error(error);
        res.status(500).send("Error saving blog details.");
      }
    } else {
      res.status(400).send("No file uploaded.");
    }
  });
});

app.get("/signup", (req, res) => {
  if (req.cookies.user) {
    res.redirect("/add");
  }
  res.render("pages/signup");
});

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  const user = new UserModal({ name, email, password });
  try {
    const result = await user.save();
    console.log(result);
    res.redirect("/login");
  } catch (error) {
    res.redirect("/signup");
    console.log("Signup again");
  }
});

app.get("/login", function (req, res) {
  if (req.cookies.user) {
    res.redirect("/add");
  }
  res.render("pages/login");
});

app.post("/login", async function (req, res) {
  const { email, password } = req.body;
  const user = await UserModal.findOne({ email: email });
  if (user) {
    if (user.password == password) {
      let minute = 60 * 10000;
      res.cookie("user", user, { maxAge: minute });
      res.redirect("/add");
    } else {
      res.redirect("/login");
    }
  } else {
    res.redirect("/login");
  }
});

app.get("/signout", function (req, res) {
  if (req.cookies.user) {
    res.clearCookie("user");
    res.redirect("/login");
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port http://localhost:${PORT}`);
});
