const express = require("express");

const bcrypt = require("bcrypt");
const fs = require("fs");
const session = require("express-session");

// Create the Express app
const app = express();

const {createServer} = require("http");
const {Server} = require("socket.io");
const httpServer = createServer(app);
const io = new Server(httpServer);

// Use the 'public' folder to serve static files
app.use(express.static("public"));

// Use the json middleware to parse JSON data
app.use(express.json());

// Use the session middleware to maintain sessions
const chatSession = session({
    secret: "game",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 300000 }
});

io.use((socket, next) => {
    chatSession(socket.request, {}, next);
});

app.use(chatSession);

// This helper function checks whether the text only contains word characters
function containWordCharsOnly(text) {
    return /^\w+$/.test(text);
}

// Handle the /register endpoint
app.post("/register", (req, res) => {
    // Get the JSON data from the body
    const { username, avatar, name, password } = req.body;

    //
    // D. Reading the users.json file
    //
    const users = JSON.parse(fs.readFileSync("data/users.json"));

    //
    // E. Checking for the user data correctness
    //
    if (!username || !avatar || !name || !password){
        return res.json({ status: "error", error: "One of the fields is empty"});
    }
    if (!containWordCharsOnly(username)) {
        return res.json({ status: "error", error: "Username can only contain letters, numbers, and underscores."});
    }
    if (username in users){
        return res.json({ status: "error", error: "Username already exists. Please choose a different one."});
    }
    //
    // G. Adding the new user account
    //
    const hash = bcrypt.hashSync(password, 10);

    //
    // H. Saving the users.json file
    //
    users[username] = { avatar, name, password: hash };
    fs.writeFileSync("data/users.json",
                        JSON.stringify(users, null, "  "));
    
    //
    // I. Sending a success response to the browser
    //
    return res.json({status:"success"});

    // Delete when appropriate
    // res.json({ status: "error", error: "This endpoint is not yet implemented." });
});

// Handle the /signin endpoint
app.post("/signin", (req, res) => {
    // Get the JSON data from the body
    const { username, password } = req.body;

    //
    // D. Reading the users.json file
    //
    const users = JSON.parse(fs.readFileSync("data/users.json"));
    //
    // E. Checking for username/password
    //
    if (!(username in users)){
        return res.json({ status: "error", error: "Username not registered"});
    }
    const hashedPassword = users[username].password;
    if (!bcrypt.compareSync(password, hashedPassword)) {
        return res.json({ status: "error", error: "Wrong password"});
    };
    
    //
    // G. Sending a success response with the user account
    //
    const avatar = users[username].avatar;
    const name = users[username].name;
    const userObject = { username, avatar, name};
    req.session.user = { username, avatar, name};
    return res.json({ status: "success", user: userObject});
 
    // Delete when appropriate
    //res.json({ status: "error", error: "This endpoint is not yet implemented." });
});

// Handle the /validate endpoint
app.get("/validate", (req, res) => {

    //
    // B. Getting req.session.user
    //
    if(req.session.user){
        return res.json({ status: "success", user: req.session.user});
    }
    //
    // D. Sending a success response with the user account
    //
    return res.json({ status: "error", error: "No logged in users"});
    // Delete when appropriate
    // res.json({ status: "error", error: "This endpoint is not yet implemented." });
});

// Handle the /signout endpoint
app.get("/signout", (req, res) => {

    //
    // Deleting req.session.user
    //
    req.session.user = null;
    //
    // Sending a success response
    //
    return res.json({ status: "success", user: req.session.user});
    // Delete when appropriate
    //res.json({ status: "error", error: "This endpoint is not yet implemented." });
});


//
// ***** Please insert your Lab 6 code here *****
//
const onlineUsers = {};
// Adding a new user
io.on("connection", (socket) => {
    if(socket.request.session.user){
        onlineUsers[socket.request.session.user.username]=socket.request.session.user;
        io.emit("add user", JSON.stringify(socket.request.session.user));
    }

    socket.on("disconnect", () =>{
        if(socket.request.session.user){
            io.emit("remove user", JSON.stringify(socket.request.session.user));
            delete onlineUsers[socket.request.session.user.username];
        }
    })

    socket.on("get users", () => {
        socket.emit("users", JSON.stringify(onlineUsers));
    });

    socket.on("get messages", () => {
        const chatroom = JSON.parse(fs.readFileSync("data/chatroom.json", "utf-8"));
        socket.emit("messages", JSON.stringify(chatroom));
    });

    socket.on("post message", (content) => {
        const res_object = {user: socket.request.session.user, datetime: new Date(), content};
        io.emit("add message", JSON.stringify(res_object));
        const chatroom = JSON.parse(fs.readFileSync("data/chatroom.json", "utf-8"));
        chatroom.push(res_object);
        fs.writeFileSync("data/chatroom.json", 
                        JSON.stringify(chatroom, null, "  "));

    });

    socket.on("user typing", (content) => {
        socket.broadcast.emit("show user typing", JSON.stringify(socket.request.session.user))
    });

    socket.on("hide users", (content) => {
        socket.broadcast.emit("hide user typing", JSON.stringify(socket.request.session.user))
    });

});


// Use a web server to listen at port 8000
httpServer.listen(8000, () => {
    console.log("The chat server has started...");
});