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
    semester: String,
    amount: String,
    status: { type: String, default: "Pending" },
    paymentStatus: { type: String, default: "Pending" },
    paymentScreenshot: String,
    username: String,
    password: String,
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
            semester: req.body.semester,
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
            username: req.body.username.trim(),
            password: req.body.password.trim()
        });

        if (!student) return res.send("❌ Invalid login");

        req.session.student = {
            _id: student._id.toString()
        };

        res.redirect("/student-scholarship-details");

    } catch (err) {
        res.send("Login error: " + err.message);
    }
});

// STUDENT DASHBOARD
app.get("/student-dashboard", async (req, res) => {
    if (!req.session.student) return res.redirect("/student-login");

    const student = await Student.findById(req.session.student._id);
    const notices = await Notice.find().sort({ createdAt: -1 });

    if (!student) return res.redirect("/student-login");

    res.render("student-dashboard", { student, notices });
});
app.get("/student-scholarship-details", async (req, res) => {
    if (!req.session.student) return res.redirect("/student-login");

    const student = await Student.findById(req.session.student._id);
    if (!student) return res.redirect("/student-login");

    res.render("student-scholarship-details", { student });
});
app.get("/student-scholarship-details", async (req, res) => {
    if (!req.session.student) return res.redirect("/student-login");

    try {
        const student = await Student.findById(req.session.student._id);

        if (!student) return res.redirect("/student-login");

        // ✅ Aadhaar se verify (admin added/approved data)
        const verifiedData = await Student.findOne({
            aadhaar: student.aadhaar,
            status: { $ne: "Pending" } // Pending nahi hona chahiye
        });

        if (!verifiedData) {
            return res.render("no-data", { student });
        }

        res.render("student-scholarship-details", { student: verifiedData });

    } catch (err) {
        res.send("Error: " + err.message);
    }
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
            await Admin.create({
                username: "scholarship@gmail.com",
                password: "scholarship106"
            });

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
// EDIT STUDENT PAGE
app.get("/edit/:id", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    try {
        const student = await Student.findById(req.params.id);

        if (!student) return res.send("Student not found");

        res.render("edit", { student });
    } catch (err) {
        res.send("Edit page error: " + err.message);
    }
});

// UPDATE STUDENT
app.post("/edit/:id", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    try {
        await Student.findByIdAndUpdate(req.params.id, {
            name: req.body.name,
            aadhaar: req.body.aadhaar,
            phone: req.body.phone,
            college: req.body.college,
            course: req.body.course,
            amount: req.body.amount,
            status: req.body.status,
            username: req.body.username,
            password: req.body.password,
            paymentStatus: req.body.paymentStatus
        });

        res.redirect("/dashboard");
    } catch (err) {
        res.send("Update error: " + err.message);
    }
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