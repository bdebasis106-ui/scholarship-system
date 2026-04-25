const express = require("express");
const fs = require("fs");
const session = require("express-session");
const path = require("path");

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

// session setup
app.use(session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: true
}));

// 📁 SAFE Read function (🔥 FIX)
function readData(file) {
    try {
        const data = fs.readFileSync(path.join(__dirname, "data", file));
        return JSON.parse(data);
    } catch (err) {
        console.log("File error:", file);
        return []; // crash nahi hoga
    }
}

function writeData(file, data) {
    fs.writeFileSync(path.join(__dirname, "data", file), JSON.stringify(data, null, 2));
}

// 🏠 HOME
app.get("/", (req, res) => {
    let notices = readData("notices.json");
    let settings = readData("settings.json") || {};

    res.render("index", {
        notices,
        settings: settings[0] || settings // array ya object dono handle
    });
});

// =======================
// 🔐 STUDENT LOGIN SYSTEM
// =======================

app.get("/student-login", (req, res) => {
    res.render("student-login");
});

app.post("/student-login", (req, res) => {
    let students = readData("students.json");

    let student = students.find(s =>
        s.username === req.body.username &&
        s.password === req.body.password
    );

    if (student) {
        req.session.student = student;
        res.redirect("/student-dashboard");
    } else {
        res.send("❌ Invalid login");
    }
});

app.get("/student-dashboard", (req, res) => {
    if (!req.session.student) return res.redirect("/student-login");

    let notices = readData("notices.json");

    res.render("student-dashboard", {
        student: req.session.student,
        notices
    });
});

// =======================
// 🪪 ID CARD
// =======================

app.get("/id-card", (req, res) => {
    if (!req.session.student) return res.redirect("/student-login");

    res.render("id-card", { student: req.session.student });
});

// =======================
// 💳 PAYMENT SYSTEM
// =======================

app.get("/payment", (req, res) => {
    if (!req.session.student) {
        return res.redirect("/student-login"); // 🔥 IMPORTANT FIX
    }

    res.render("payment", { student: req.session.student });
});

app.post("/pay", (req, res) => {
    res.redirect("/payment-success");
});

app.get("/payment-success", (req, res) => {
    if (!req.session.student) return res.redirect("/student-login");

    res.render("payment-success", { student: req.session.student });
});

app.get("/payment-failed", (req, res) => {
    res.render("payment-failed");
});

// =======================
// OLD SYSTEM (ADMIN + ETC)
// =======================

// ABOUT
app.get("/about", (req, res) => {
    res.render("about");
});

// NOTICE
app.get("/notice", (req, res) => {
    let notices = readData("notices.json");
    res.render("notice", { notices });
});

// CONTACT
app.get("/contact", (req, res) => {
    res.render("contact");
});

// Aadhaar check
app.post("/check", (req, res) => {
    let students = readData("students.json");

    let student = students.find(s => s.aadhaar === req.body.aadhaar);

    if (student) {
        res.render("result", { student });
    } else {
        res.send("❌ No record found");
    }
});

// ADMIN LOGIN
app.get("/admin", (req, res) => {
    res.render("admin-login");
});

app.post("/admin/login", (req, res) => {
    let admin = readData("admin.json")[0] || {};

    if (
        req.body.username === admin.username &&
        req.body.password === admin.password
    ) {
        req.session.admin = true;
        res.redirect("/dashboard");
    } else {
        res.send("Invalid login");
    }
});

// DASHBOARD
app.get("/dashboard", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    let students = readData("students.json");
    let notices = readData("notices.json");

    res.render("dashboard", { students, notices });
});

// ADD STUDENT
app.post("/add", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    let students = readData("students.json");

    students.push({
        id: Date.now(),
        name: req.body.name,
        aadhaar: req.body.aadhaar,
        phone: req.body.phone,
        college: req.body.college,
        course: req.body.course,
        amount: req.body.amount,
        status: req.body.status,
        username: req.body.username,
        password: req.body.password,
        paymentStatus: "Pending"
    });

    writeData("students.json", students);
    res.redirect("/dashboard");
});

// LOGOUT
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

// =======================
// ❌ ERROR HANDLER (🔥 NEW)
// =======================

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something broke! ❌");
});

// server
app.listen(process.env.PORT || 3000, () => {
    console.log("Server running");
});