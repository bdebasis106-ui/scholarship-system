const mongoose = require("mongoose");

mongoose.connect("mongodb+srv://debasis:12345678@cluster0.pkeg2f7.mongodb.net/scholarship_system?retryWrites=true&w=majority&appName=Cluster0")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

module.exports = mongoose;