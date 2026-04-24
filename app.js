const express = require("express");
const fs = require("fs");
const session = require("express-session");

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

// session setup
app.use(session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: true
}));

// 📁 Read / Write functions
function readData(file) {
    return JSON.parse(fs.readFileSync("./data/" + file));
}

function writeData(file, data) {
    fs.writeFileSync("./data/" + file, JSON.stringify(data, null, 2));
}

// 🏠 HOME ROUTE
app.get("/", (req, res) => {
    let notices = readData("notices.json");
    res.render("index", { notices });
});

// ABOUT PAGE
app.get("/about", (req, res) => {
    res.render("about");
});

// NOTICE PAGE
app.get("/notice", (req, res) => {
    let notices = readData("notices.json");
    res.render("notice", { notices });
});

// CONTACT PAGE
app.get("/contact", (req, res) => {
    res.render("contact");
});

// 🔍 Aadhaar Check
app.post("/check", (req, res) => {
    let students = readData("students.json");

    let student = students.find(s => s.aadhaar === req.body.aadhaar);

    if (student) {
        res.render("result", { student });
    } else {
        res.send("❌ No record found");
    }
});

// 🔐 Admin Login Page
app.get("/admin", (req, res) => {
    res.render("admin-login");
});

// 🔐 Admin Login Logic
app.post("/admin/login", (req, res) => {
    let admin = readData("admin.json")[0];

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

// 📊 Dashboard
app.get("/dashboard", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    let students = readData("students.json");
    let notices = readData("notices.json");

    res.render("dashboard", { students, notices });
});

// ➕ Add Student
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
        status: req.body.status
    });

    writeData("students.json", students);
    res.redirect("/dashboard");
});

// 📢 Add Notice
app.post("/add-notice", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    let notices = readData("notices.json");

    notices.unshift({
        id: Date.now(),
        title: req.body.title,
        message: req.body.message,
        date: new Date().toLocaleDateString("en-IN")
    });

    writeData("notices.json", notices);
    res.redirect("/dashboard");
});

// 📲 WhatsApp Important Notice Links
app.post("/whatsapp-notice", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    let students = readData("students.json");
    let message = req.body.message;

    res.render("whatsapp-links", { students, message });
});

// ❌ Delete Notice
app.get("/delete-notice/:id", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    let notices = readData("notices.json");
    notices = notices.filter(n => n.id != req.params.id);

    writeData("notices.json", notices);
    res.redirect("/dashboard");
});

// ✏️ Edit Student
app.get("/edit/:id", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    let students = readData("students.json");
    let student = students.find(s => s.id == req.params.id);

    res.render("edit", { student });
});

// ✅ Update Student
app.post("/update/:id", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    let students = readData("students.json");

    students = students.map(s => {
        if (s.id == req.params.id) {
            return {
                id: s.id,
                name: req.body.name,
                aadhaar: req.body.aadhaar,
                phone: req.body.phone,
                college: req.body.college,
                course: req.body.course,
                amount: req.body.amount,
                status: req.body.status
            };
        }
        return s;
    });

    writeData("students.json", students);
    res.redirect("/dashboard");
});

// ❌ Delete Student
app.get("/delete/:id", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");

    let students = readData("students.json");
    students = students.filter(s => s.id != req.params.id);

    writeData("students.json", students);
    res.redirect("/dashboard");
});

// 🚪 Logout
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/admin");
});

// server
app.listen(process.env.PORT || 3000, () => {
    console.log("Server running");
});