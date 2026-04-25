const express = require("express");
const session = require("express-session");
const multer = require("multer");
const mongoose = require("mongoose");

const app = express();

const upload = multer({ dest: "public/uploads/" });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

app.use(session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: true
}));

// ✅ MongoDB CONNECT
mongoose.connect("mongodb+srv://debasis:12345678@cluster0.pkeg2f7.mongodb.net/scholarship_system")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// =======================
// 📦 SCHEMA
// =======================

const studentSchema = new mongoose.Schema({
    name: String,
    aadhaar: String,
    phone: String,
    college: String,
    course: String,
    amount: String,
    status: { type: String, default: "Pending" },
    paymentStatus: { type: String, default: "Pending" },
    paymentScreenshot: String,
    username: String,
    password: String,
    otp: String,
    otpExpiry: Date
});

const noticeSchema = new mongoose.Schema({
    title: String,
    message: String,
    date: { type: String, default: () => new Date().toLocaleDateString() }
});

const adminSchema = new mongoose.Schema({
    username: String,
    password: String
});

const Student = mongoose.model("Student", studentSchema);
const Notice = mongoose.model("Notice", noticeSchema);
const Admin = mongoose.model("Admin", adminSchema);

// =======================
// HOME
// =======================

app.get("/", async (req, res) => {
    const notices = await Notice.find().sort({ _id: -1 });

    res.render("index", {
        notices,
        settings: {
            collegeName: "PNS SCHOOL OF ENGINEERING AND TECHNOLOGY",
            phone: "9937511490",
            email: "pnsset@gmail.com"
        }
    });
});

// =======================
// REGISTER
// =======================

app.get("/student-register", (req, res) => {
    res.render("student-register");
});

app.post("/student-register", async (req, res) => {
    const { name, aadhaar, phone, college, course, username, password } = req.body;

    await Student.create({
        name,
        aadhaar,
        phone,
        college,
        course,
        amount: "16300",
        username,
        password
    });

    res.redirect("/student-login");
});

// =======================
// LOGIN + OTP
// =======================

app.get("/student-login", (req, res) => {
    res.render("student-login");
});

app.post("/student-login", async (req, res) => {
    const student = await Student.findOne({
        username: req.body.username,
        password: req.body.password
    });

    if (!student) return res.send("❌ Invalid login");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    student.otp = otp;
    student.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await student.save();

    req.session.pendingStudentId = student._id;

    console.log("OTP:", otp);

    res.redirect("/verify-otp");
});

// =======================
// OTP VERIFY
// =======================

app.get("/verify-otp", (req, res) => {
    res.render("verify-otp");
});

app.post("/verify-otp", async (req, res) => {
    const student = await Student.findById(req.session.pendingStudentId);

    if (!student) return res.redirect("/student-login");

    if (student.otp !== req.body.otp) return res.send("Invalid OTP");

    if (student.otpExpiry < new Date()) return res.send("OTP expired");

    student.otp = "";
    student.otpExpiry = null;
    await student.save();

    req.session.student = student;

    res.redirect("/student-dashboard");
});

// =======================
// DASHBOARD
// =======================

app.get("/student-dashboard", async (req, res) => {
    if (!req.session.student) return res.redirect("/student-login");

    const student = await Student.findById(req.session.student._id);
    const notices = await Notice.find().sort({ _id: -1 });

    res.render("student-dashboard", { student, notices });
});

// =======================
// PAYMENT
// =======================

app.get("/payment", (req, res) => {
    res.render("payment", { student: req.session.student });
});

app.post("/pay", upload.single("screenshot"), async (req, res) => {
    const student = await Student.findById(req.session.student._id);

    student.paymentStatus = "Verification Pending";
    student.paymentScreenshot = req.file ? "/uploads/" + req.file.filename : "";

    await student.save();

    res.redirect("/payment-success");
});

app.get("/payment-success", (req, res) => {
    res.render("payment-success", { student: req.session.student });
});

// =======================
// ADMIN
// =======================

app.get("/admin", (req, res) => res.render("admin-login"));

app.post("/admin/login", async (req, res) => {
    const admin = await Admin.findOne({
        username: req.body.username,
        password: req.body.password
    });

    if (!admin) return res.send("Invalid login");

    req.session.admin = true;
    res.redirect("/dashboard");
});

app.get("/dashboard", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    const students = await Student.find().sort({ _id: -1 });
    const notices = await Notice.find().sort({ _id: -1 });

    res.render("dashboard", { students, notices });
});

// =======================
// START
// =======================

app.listen(process.env.PORT || 3000, () => {
    console.log("Server running");
});