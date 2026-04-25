const express = require("express");
const session = require("express-session");
const multer = require("multer");
const mongoose = require("mongoose");
const axios = require("axios");

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

mongoose.set("strictQuery", false);

mongoose.connect("mongodb+srv://debasis:Debasis%402026PNS@cluster0.pkeg2f7.mongodb.net/scholarship_system?retryWrites=true&w=majority&appName=Cluster0")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("MongoDB Error:", err));

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
    otpExpiry: Date,
    photo: String
}, { timestamps: true });

const noticeSchema = new mongoose.Schema({
    title: String,
    message: String,
    date: { type: String, default: () => new Date().toLocaleDateString("en-IN") }
}, { timestamps: true });

const adminSchema = new mongoose.Schema({
    username: String,
    password: String
});

const Student = mongoose.model("Student", studentSchema);
const Notice = mongoose.model("Notice", noticeSchema);
const Admin = mongoose.model("Admin", adminSchema);

const settings = {
    collegeName: "PNS SCHOOL OF ENGINEERING AND TECHNOLOGY",
    phone: "9937511490",
    email: "pnsset@gmail.com"
};

// HOME
app.get("/", async (req, res) => {
    try {
        const notices = await Notice.find().sort({ createdAt: -1 });
        res.render("index", { notices, settings });
    } catch (err) {
        res.send("Home error: " + err.message);
    }
});

// BASIC PAGES
app.get("/about", (req, res) => res.render("about"));
app.get("/contact", (req, res) => res.render("contact"));

app.get("/notice", async (req, res) => {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.render("notice", { notices });
});

// AADHAAR CHECK
app.post("/check", async (req, res) => {
    const student = await Student.findOne({ aadhaar: req.body.aadhaar });

    if (!student) return res.send("❌ No record found");

    res.render("result", { student });
});

// STUDENT REGISTER
app.get("/student-register", (req, res) => {
    res.render("student-register");
});

app.post("/student-register", async (req, res) => {
    try {
        const { name, aadhaar, phone, college, course, username, password } = req.body;

        await Student.create({
            name,
            aadhaar,
            phone,
            college,
            course,
            amount: "16300",
            username,
            password,
            status: "Pending",
            paymentStatus: "Pending",
            paymentScreenshot: "",
            photo: ""
        });

        res.redirect("/student-login");
    } catch (err) {
        res.send("Registration error: " + err.message);
    }
});

// STUDENT LOGIN
app.get("/student-login", (req, res) => {
    res.render("student-login");
});

app.post("/student-login", async (req, res) => {
    try {
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
        
        await sendOTP(student.phone, otp);
        res.redirect("/verify-otp");
    } catch (err) {
        res.send("Login error: " + err.message);
    }
});

// OTP VERIFY
app.get("/verify-otp", (req, res) => {
    if (!req.session.pendingStudentId) return res.redirect("/student-login");
    res.render("verify-otp");
});

app.post("/verify-otp", async (req, res) => {
    try {
        const student = await Student.findById(req.session.pendingStudentId);

        if (!student) return res.redirect("/student-login");

        if (student.otp !== req.body.otp) return res.send("❌ Invalid OTP");

        if (student.otpExpiry < new Date()) return res.send("❌ OTP expired");

        student.otp = "";
        student.otpExpiry = null;
        await student.save();

        req.session.student = {
            _id: student._id.toString()
        };

        req.session.pendingStudentId = null;

        res.redirect("/student-dashboard");
    } catch (err) {
        res.send("OTP error: " + err.message);
    }
});
async function sendOTP(phone, otp) {
    await axios.get("https://www.fast2sms.com/dev/bulkV2", {
        params: {
            authorization: "PASTE_REAL_API_KEY_HERE",
            route: "otp",
            variables_values: otp,
            flash: 0,
            numbers: phone
        }
    });
}

// STUDENT DASHBOARD
app.get("/student-dashboard", async (req, res) => {
    if (!req.session.student) return res.redirect("/student-login");

    const student = await Student.findById(req.session.student._id);
    const notices = await Notice.find().sort({ createdAt: -1 });

    if (!student) return res.redirect("/student-login");

    res.render("student-dashboard", { student, notices });
});

// ID CARD
app.get("/id-card", async (req, res) => {
    if (!req.session.student) return res.redirect("/student-login");

    const student = await Student.findById(req.session.student._id);
    res.render("id-card", { student });
});

// PAYMENT
app.get("/payment", async (req, res) => {
    if (!req.session.student) return res.redirect("/student-login");

    const student = await Student.findById(req.session.student._id);
    res.render("payment", { student });
});

app.post("/pay", upload.single("screenshot"), async (req, res) => {
    if (!req.session.student) return res.redirect("/student-login");

    const student = await Student.findById(req.session.student._id);

    student.paymentStatus = "Verification Pending";
    student.paymentScreenshot = req.file ? "/uploads/" + req.file.filename : "";

    await student.save();

    res.redirect("/payment-success");
});

app.get("/payment-success", async (req, res) => {
    if (!req.session.student) return res.redirect("/student-login");

    const student = await Student.findById(req.session.student._id);
    res.render("payment-success", { student });
});

app.get("/payment-failed", (req, res) => {
    res.render("payment-failed");
});

// ADMIN LOGIN
app.get("/admin", (req, res) => res.render("admin-login"));

app.post("/admin/login", async (req, res) => {
    try {
        let admin = await Admin.findOne({
            username: req.body.username,
            password: req.body.password
        });

        if (!admin) {
            await Admin.create({ username: "scholarship@gmail.com", password: "scholarship106" });

            admin = await Admin.findOne({
                username: req.body.username,
                password: req.body.password
            });
        }

        if (!admin) return res.send("Invalid login");

        req.session.admin = true;
        res.redirect("/dashboard");
    } catch (err) {
        res.send("Admin login error: " + err.message);
    }
});

// ADMIN DASHBOARD
app.get("/dashboard", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    const students = await Student.find().sort({ createdAt: -1 });
    const notices = await Notice.find().sort({ createdAt: -1 });

    res.render("dashboard", { students, notices });
});

// ADD STUDENT
app.post("/add", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    await Student.create({
        name: req.body.name,
        aadhaar: req.body.aadhaar,
        phone: req.body.phone,
        college: req.body.college,
        course: req.body.course,
        amount: req.body.amount,
        status: req.body.status,
        username: req.body.username,
        password: req.body.password,
        paymentStatus: "Pending",
        paymentScreenshot: "",
        photo: ""
    });

    res.redirect("/dashboard");
});

// NOTICE
app.post("/add-notice", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    await Notice.create({
        title: req.body.title,
        message: req.body.message
    });

    res.redirect("/dashboard");
});

app.get("/delete-notice/:id", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    await Notice.findByIdAndDelete(req.params.id);
    res.redirect("/dashboard");
});

// PAYMENT APPROVE / REJECT
app.get("/approve-payment/:id", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    await Student.findByIdAndUpdate(req.params.id, {
        paymentStatus: "Paid"
    });

    res.redirect("/dashboard");
});

app.get("/reject-payment/:id", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    await Student.findByIdAndUpdate(req.params.id, {
        paymentStatus: "Rejected"
    });

    res.redirect("/dashboard");
});

// DELETE STUDENT
app.get("/delete/:id", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    await Student.findByIdAndDelete(req.params.id);
    res.redirect("/dashboard");
});

// LOGOUT
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

// ERROR HANDLER
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something broke! ❌ " + err.message);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
});