const express = require("express");
var bodyParser = require("body-parser");
const SHA256 =  require('crypto-js/sha256');
const mysql = require("mysql");
const port = 3000;
const app = express();
const session = require("express-session")
const cookieParser = require("cookie-parser");

const name_pat = /^[a-zA-Z0-9 ]+$/;
const user_pat = /^[a-zA-Z0-9]+$/;
const email_pat = /^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$/;
const num_pat = /^[0-9]+$/;

var connection = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"{Enter password here}",
    database:"lib"
});

connection.connect((err) => {
    if(!!err){
        console.log("DB Error");
    }
    else{
        console.log("DB Connection Sucess");
    }
});

function calculateHash(input){
    return SHA256(input).toString();
}


let redirectuser = function(request,response,next){
    if(!request.session.userid){
        response.redirect("/illegal_access");
    }else{
        next();
    }
}

let redirectadmin = function(request,response,next){
    if(!request.session.adminid){
        response.redirect("/illegal_access");
    }else{
        next();
    }
}

function signupRegex(data){
    
    if(data.usr.match(user_pat)==null){
        return false;
    }
    if(data.name.match(name_pat)==null){
        return false;
    }
    if(data.email.match(email_pat)==null){
        return false;
    }
    if(data.phone.match(num_pat)==null){
        return false;
    }
    return true;
}

function bookRegex(data){
    if(data.name.match(name_pat)==null){
        return false;
    }
    if(data.author.match(name_pat)==null){
        return false;
    }
    if(data.pub.match(name_pat)==null){
        return false;
    }
    if(data.qty.match(num_pat)==null){
        return false;
    }
    return true;
}

app.listen(port,function(){
    console.log("Server is ready at port "+port);
});

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    name: "library",
    secret: "{Enter secret here}",
    resave: false,
    saveUninitialized:true,
    cookie:{
        maxAge: 1000*60*60,
        sameSite: true,
        secure: false
    }
}))

app.get("/", (request,response) => {
    request.session.userid = null;
    request.session.adminid = null;
    response.sendFile(__dirname + "/public/welcome.html", (err)=>{
        if(err)console.log(err);
     });
});

app.get("/illegal_access", (request,response) => {
    response.sendFile(__dirname + "/public/illegal_access.html", (err)=>{
        if(err)console.log(err);
     });
});

app.get("/usersignup", (request,response) => {
    response.sendFile(__dirname + "/public/user_signup.html", (err)=>{
        if(err)console.log(err);
    });
});

app.post("/usersignup", (request,response) => {
    let data = request.body;
    if(data.pass!=data.repass){
        response.sendFile(__dirname + "/public/reg_error.html", (err)=>{
            if(err)console.log(err);
        });
    }
    else if(signupRegex(data)){
        let passHash = calculateHash(data.pass);
        connection.query("insert into users (usr,name,email,phone,pass) values (?,?,?,?,?);",[data.usr,data.name,data.email,data.phone,passHash],(err,rows) =>{
            if(!err){
                response.sendFile(__dirname + "/public/reg_suc.html", (err)=>{
                    if(err)console.log(err);
                });
            }
            else{
                response.sendFile(__dirname + "/public/reg_error.html", (err)=>{
                    if(err)console.log(err);
                });
            }
        });
        
    }else{
        response.sendFile(__dirname + "/public/reg_error.html", (err)=>{
            if(err)console.log(err);
        });
    }
});

app.get("/userlog", (request,response) => {
    response.sendFile(__dirname + "/public/user_login.html", (err)=>{
        if(err)console.log(err);
    });
});

app.post("/userlog", (request,response) => {
    
    let data = request.body;
    let passHash = calculateHash(data.pass);
    if(data.usr.match(user_pat)==null){
        response.sendFile(__dirname + "/public/login_error.html", (err)=>{
            if(err)console.log(err);
        });
    }else{
    connection.query("select pass from users where usr= ?;",[data.usr],(err,rows) => {
        if(!err){
            try{
            if(rows[0].pass===passHash){
                request.session.userid = data.usr;
                response.sendFile(__dirname + "/public/user_page.html", (err)=>{
                    if(err)console.log(err);
                });
            } else{
                request.session.userid = null;
                response.sendFile(__dirname + "/public/login_error.html", (err)=>{
                    if(err)console.log(err);
                });      
            }
            }catch(err){
                response.sendFile(__dirname + "/public/login_error.html", (err)=>{
                    if(err)console.log(err);
                });
            }
        }
        else{
            response.sendFile(__dirname + "/public/login_error.html", (err)=>{
                if(err)console.log(err);
            });
        }
    });
}
});

app.get("/userhome",redirectuser,(request,response) => {
    response.sendFile(__dirname + "/public/user_page.html", (err)=>{
        if(err)console.log(err);
    });
});


app.get("/username",redirectuser,(request,response) => {
    response.send(request.session.userid);
});


app.get("/userbook", redirectuser,(request,response)=>{
    response.sendFile(__dirname+"/public/user_book.html", (err)=>{
        if(err)console.log(err);
    });
});

app.post("/userbook", (request,response) => {
    connection.query("select * from book;", (err,rows) => {
        try{
            if(!err){
                
                let arr = [];
                for(let i=0;i<rows.length;i++){
                    let obj = {
                        "bid":rows[i].bid,
                        "name":rows[i].name,
                        "author":rows[i].author,
                        "publisher":rows[i].publisher,
                        "avail":rows[i].avail
                    }
                    arr.push(obj);
                }
                let res = {
                    "status":"true",
                    "data": JSON.stringify(arr)
                }
                response.send(JSON.stringify(res));
            }
            else{
                let res = {"status":"false"};
                response.send(JSON.stringify(res));
            }
        }catch{
            let res = {"status":"false"};
            response.send(JSON.stringify(res));
        }

    });
});

app.post("/userbooksearch", (request,response) => {
    let data = request.body;
    if(data.bookname.match(name_pat)==null){
        let res = {"status":"false"};
        response.send(JSON.stringify(res));

    }else{
        let search = '%'+data.bookname+'%';
    connection.query("select * from book where name like ?;",[search],(err,rows) => {
        try{
            if(!err){
                
                let arr = [];
                for(let i=0;i<rows.length;i++){
                    let obj = {
                        "bid":rows[i].bid,
                        "name":rows[i].name,
                        "author":rows[i].author,
                        "publisher":rows[i].publisher,
                        "avail":rows[i].avail
                    }
                    arr.push(obj);
                }
                let res = {
                    "status":"true",
                    "data": JSON.stringify(arr)
                }
                response.send(JSON.stringify(res));
            }
            else{
                let res = {"status":"false"};
                response.send(JSON.stringify(res));
            }
        }catch{
            let res = {"status":"false"};
            response.send(JSON.stringify(res));
        }

    });
    }
});

app.get("/userrequestout",redirectuser,(request,response)=>{
    response.sendFile(__dirname+"/public/user_checkout.html", (err)=>{
        if(err)console.log(err);
    });
});

app.get("/userrequestin",redirectuser,(request,response)=>{
    response.sendFile(__dirname+"/public/user_checkin.html", (err)=>{
        if(err)console.log(err);
    });
});

app.post("/userrequest",redirectuser,(request,response) => {
    let data = request.body;
    let datetime = new Date();
    datetime = datetime.toUTCString();
    let usr = request.session.userid;
    if(usr===null){
        response.send({"status":"Illegal Access Error"});
    }else if(data.bid.match(num_pat)==null){
        let res = {"status":"Book Not Found"};
        response.send(JSON.stringify(res));
    }
    else{
        connection.query("select * from book where bid= ?;",[data.bid],(err,rows) => {
            try{
                if(!err){
                    let prevUsers = rows[0].users;
                    prevUsers = prevUsers.split(";");
                    if(data.type === "in" && !prevUsers.includes(usr)){
                        let res = {"status":"This book does not belong to you. You cannot apply for a checkin."};
                            response.send(JSON.stringify(res));
                    }else{
                    connection.query("insert into request (usr,bid,reqtype,dt,status) values (?,?,?,?,'P');",[usr,data.bid,data.type,datetime],(err,rows) =>{
                        if(!err){
                            let res = {"status":"Request Successful"};
                            response.send(JSON.stringify(res));
                        }
                        else{
                            let res = {"status":"Request Failed"};
                            response.send(JSON.stringify(res));
                        }
                    });
                    }
                }
                else{
                    let res = {"status":"Book Not Found"};
                    response.send(JSON.stringify(res));
                }
            }catch{
                let res = {"status":"Book Not Found"};
                response.send(JSON.stringify(res));
            }
    });
}
});

app.post("/userbookcheckout",(request,response) => {
    let usr = request.session.userid;
    if(usr===null){
        let res = {"status":"false"};
        response.send(JSON.stringify(res));
    }else{
    connection.query("select * from book;", (err,rows) => {
        try{
            if(!err){
                
                let arr = [];
                for(let i=0;i<rows.length;i++){
                    let prevUsers = rows[i].users;
                    prevUsers = prevUsers.split(";");
                    if(prevUsers.includes(usr))
                    {
                        let obj = {
                        "bid":rows[i].bid,
                        "name":rows[i].name,
                        "author":rows[i].author,
                        "publisher":rows[i].publisher
                    }
                    arr.push(obj);
                }
                }
                if(arr.length==0){
                    let res = {"status":"false"};
                    response.send(JSON.stringify(res));
                }
                else{
                let res = {
                    "status":"true",
                    "data": JSON.stringify(arr)
                }
                response.send(JSON.stringify(res));
            }
            }
            else{
                let res = {"status":"false"};
                response.send(JSON.stringify(res));
            }
        }catch{
            let res = {"status":"false"};
            response.send(JSON.stringify(res));
        }

    });
    }
});

app.post("/userpendreq", (request,response) => {
    let usr = request.session.userid;
    if(usr===null){
        let res = {"status":"false"};
        response.send(JSON.stringify(res));
    }else{
    connection.query("select * from request where usr= ? and status='P';",[usr],(err,rows) => {
        try{
            if(!err){
                
                let arr = [];
                for(let i=0;i<rows.length;i++){
                    let obj = {
                        "reqid":rows[i].reqid,
                        "bid":rows[i].bid,
                        "reqtype":rows[i].reqtype,
                        "dt":rows[i].dt
                    }
                    arr.push(obj);
                }
                let res = {
                    "status":"true",
                    "data": JSON.stringify(arr)
                }
                response.send(JSON.stringify(res));
            }
            else{
                let res = {"status":"false"};
                response.send(JSON.stringify(res));
            }
        }catch{
            let res = {"status":"false"};
            response.send(JSON.stringify(res));
        }

    });
    }
});

app.get("/userhome",redirectuser, (request,response) => {
    response.sendFile(__dirname + "/public/user_page.html", (err)=>{
        if(err)console.log(err);
    });
});


app.get("/adminhome",redirectadmin, (request,response) => {
    response.sendFile(__dirname + "/public/admin_page.html", (err)=>{
        if(err)console.log(err);
    });
});

app.get("/adminlog",(request,response) => {
    response.sendFile(__dirname + "/public/admin_login.html", (err)=>{
        if(err)console.log(err);
    });
});

app.post("/adminlog", (request,response) => {
    let data = request.body;
    let passHash = calculateHash(data.pass);
    if(data.usr.match(user_pat)==null){
        response.sendFile(__dirname + "/public/login_error.html", (err)=>{
            if(err)console.log(err);
        });
    }else{
    connection.query("select pass from admin where usr= ?;",[data.usr],(err,rows) => {
        if(!err){
            try{
            if(rows[0].pass===passHash){
                request.session.adminid = data.usr;
                response.sendFile(__dirname + "/public/admin_page.html", (err)=>{
                    if(err)console.log(err);
                });
            } else{
                response.sendFile(__dirname + "/public/login_error.html", (err)=>{
                    if(err)console.log(err);
                });      
            }
            }catch(err){
                response.sendFile(__dirname + "/public/login_error.html", (err)=>{
                    if(err)console.log(err);
                });
            }
        }
        else{
            response.sendFile(__dirname + "/public/login_error.html", (err)=>{
                if(err)console.log(err);
            });
        }
    });
}
});

app.get("/adminname",redirectadmin,(request,response) => {
    response.send(request.session.adminid);
    
});

app.get("/userdets",redirectadmin,(request,response) => {
    response.sendFile(__dirname + "/public/admin_userdets.html", (err)=>{
        if(err)console.log(err);
    });
});

app.post("/userdets",(request,response) => {
    let data = request.body;
    if(data.username.match(user_pat)==null){
        response.sendFile(__dirname + "/public/login_error.html", (err)=>{
            if(err)console.log(err);
        });
    }else{
    connection.query("select * from users where usr= ?;",[data.username],(err,rows)=>{
        if(!err){
            try{
                let res = {
                    "status":"true",
                    "username":rows[0].usr,
                    "name":rows[0].name,
                    "email":rows[0].email,
                    "phone":rows[0].phone
                }
                response.send(JSON.stringify(res));
            }catch{
                let res = {"status":"false"};
                response.send(JSON.stringify(res));    
            }
        }else{
            let res = {"status":"false"};
            response.send(JSON.stringify(res));
        }
    });
}
});

app.get("/adminbook",redirectadmin,(request,response) => {
    response.sendFile(__dirname + "/public/admin_book.html", (err) => {
        if(err)console.log(err);
    });
})

app.post("/adminbook",(request,response) => {
    connection.query("select * from book;", (err,rows) => {
        try{
            if(!err){
                
                let arr = [];
                for(let i=0;i<rows.length;i++){
                    
                    let obj = {
                        "bid":rows[i].bid,
                        "name":rows[i].name,
                        "author":rows[i].author,
                        "publisher":rows[i].publisher,
                        "avail":rows[i].avail,
                        "users":rows[i].users,
                        "maxqty":rows[i].maxqty
                    }
                    arr.push(obj);
                }
                let res = {
                    "status":"true",
                    "data": JSON.stringify(arr)
                }
                response.send(JSON.stringify(res));
            }
            else{
                let res = {"status":"false"};
                response.send(JSON.stringify(res));
            }
        }catch{
            let res = {"status":"false"};
            response.send(JSON.stringify(res));
        }

    });
});

app.get("/bookreg",redirectadmin,(request,response) => {
    response.sendFile(__dirname + "/public/book_reg.html", (err) => {
        if(err)console.log(err);
    });
});

app.post("/bookreg",(request,response) => {
    let data = request.body;
    if(bookRegex(data)){
    connection.query("INSERT INTO book (name,author,publisher,maxqty,avail,users) VALUES (?,?,?,?,?,'');",[data.name,data.author,data.pub,data.qty,data.qty],(err,rows)=>{
        if(!err){
            response.sendFile(__dirname + "/public/book_reg_suc.html", (err)=>{
                if(err)console.log(err);
            });
        }
        else{
            response.sendFile(__dirname + "/public/book_reg_err.html", (err)=>{
                if(err)console.log(err);
            });
        }
    });
}else{
    response.sendFile(__dirname + "/public/book_reg_err.html", (err)=>{
        if(err)console.log(err);
    });
}
});

app.get("/bookdel",redirectadmin,(request,response) => {
    response.sendFile(__dirname + "/public/book_del.html", (err) => {
        if(err)console.log(err);
    });
});

app.post("/bookdel", (request,response) => {
    let data = request.body;
    if(data.bid.match(num_pat)==null){
        response.sendFile(__dirname + "/public/book_del_err.html", (err)=>{
            if(err)console.log(err);
        });
    }else{
    connection.query("select * from book where bid= ?;",[data.bid],(err,rows)=>{
        try{
            if(!err){
            let id = rows[0].bid;
            connection.query("delete from book where bid= ?;",[data.bid], (err,rows)=>{
                if(!err){
                    response.sendFile(__dirname + "/public/book_del_suc.html", (err)=>{
                        if(err)console.log(err);
                    });
                }
                else{
                    response.sendFile(__dirname + "/public/book_del_err.html", (err)=>{
                        if(err)console.log(err);
                    });
                }
            });
            connection.query("delete from request where bid= ? and status='P';",[data.bid], (err,rows)=>{
                if(!err){
                }
                else{
                }
            });
            }else{
                response.sendFile(__dirname + "/public/book_del_err.html", (err)=>{
                    if(err)console.log(err);
                });
            }
        }catch{
            response.sendFile(__dirname + "/public/book_del_err.html", (err)=>{
                if(err)console.log(err);
            });
        }

    });
}
});

app.get("/adminreq",redirectadmin,(request,response) => {
    response.sendFile(__dirname + "/public/admin_req.html", (err)=>{
        if(err)console.log(err);
    });
});

app.post("/adminpendreq", (request,response) => {
    connection.query("select * from request where status='P';", (err,rows) => {
        try{
            if(!err){
                
                let arr = [];
                for(let i=0;i<rows.length;i++){
                    let obj = {
                        "reqid":rows[i].reqid,
                        "usr":rows[i].usr,
                        "bid":rows[i].bid,
                        "reqtype":rows[i].reqtype,
                        "dt":rows[i].dt
                    }
                    arr.push(obj);
                }
                let res = {
                    "status":"true",
                    "data": JSON.stringify(arr)
                }
                response.send(JSON.stringify(res));
            }
            else{
                let res = {"status":"false"};
                response.send(JSON.stringify(res));
            }
        }catch{
            let res = {"status":"false"};
            response.send(JSON.stringify(res));
        }

    });
});

app.post("/adminappdeny",(request,response)=>{
    let data = request.body;
    let bid = null;
    let usr = null;
    let reqtype = null;
    let prevUsers = null;
    let avail = null;
    connection.query("select * from request where reqid= ? and status='P';",[data.reqid],(err,rows) =>{
        try{
            if(!err){
                bid = rows[0].bid;
                usr = rows[0].usr;
                reqtype = rows[0].reqtype;
                if(reqtype == "out"){
                    connection.query("select * from book where bid= ? and avail>0;",[bid],(err,rows) =>{
                        prevUsers = rows[0].users;
                        avail = rows[0].avail;
                        try{
                            if(!err){
                                bid = rows[0].bid;
                                connection.query("update request set status= ? where reqid= ?;",[data.action,data.reqid],(err,rows) =>{
                                    if(!err){
                                        if(data.action == "D"){
                                            let res = {"status":"Request Action Sucessful"};
                                            response.send(JSON.stringify(res));
                                        }
                                        return;
                                    }
                                    else{
                                        let res = {"status":"Request SQL Error"};
                                        response.send(JSON.stringify(res));
                                        return;
                                    }
                                });
                                if(data.action==="A" && !prevUsers.split(";").includes(usr)){
                                avail--;
                                if(prevUsers === ''){
                                    prevUsers = usr;
                                }else{
                                    prevUsers = prevUsers + ';' +usr; 
                                }
                                connection.query("update book set avail= ?,users = ? where bid= ?;",[avail,prevUsers,bid],(err,rows) =>{
                                    if(!err){
                                        let res = {"status":"Request Action Sucessful"};
                                        response.send(JSON.stringify(res));
                                        return;
                                    }
                                    else{
                                        let res = {"status":"Request SQL Error"};
                                        response.send(JSON.stringify(res));
                                        return;
                                    }
                                });
                                }else if(prevUsers.split(";").includes(usr)){
                                    let res = {"status":"Request Action Sucessful. The User already owns this book."};
                                    response.send(JSON.stringify(res));
                                }
                            }else{
                                let res = {"status":"SQL Error Occured"}
                                response.send(JSON.stringify(res)); 
                            }
                        }catch{
                            let res = {"status":"The book is not available."}
                            response.send(JSON.stringify(res));
                        }
                    
                    });
                }

                if(reqtype == "in"){
                    connection.query("select * from book where bid= ?;",[bid],(err,rows) =>{
                        try{
                            if(!err){
                                prevUsers = rows[0].users;
                                avail = rows[0].avail;
                                prevUsers = prevUsers.split(";");
                                connection.query("update request set status= ? where reqid= ?;",[data.action,data.reqid],(err,rows) =>{
                                    if(!err){
                                        if(data.action == "D"){
                                            let res = {"status":"Request Action Sucessful"};
                                            response.send(JSON.stringify(res));
                                        }
                                        return;
                                    }
                                    else{
                                        let res = {"status":"Request SQL Error"};
                                        response.send(JSON.stringify(res));
                                        return;
                                    }
                                });
                                if(data.action==="A" && prevUsers.includes(usr)){
                                avail++;
                                let str = "";
                                prevUsers = prevUsers.filter(item => item !== usr);
                                for(let i=0;i<prevUsers.length;i++){
                                    str+=prevUsers[i];
                                    if(i!=prevUsers.length-1)str+=";";
                                }
                                connection.query("update book set avail= ?,users= ? where bid= ?;",[avail,str,bid],(err,rows) =>{
                                    if(!err){
                                        let res = {"status":"Request Action Sucessful"};
                                        response.send(JSON.stringify(res));
                                        return;
                                    }
                                    else{
                                        let res = {"status":"Request SQL Error"};
                                        response.send(JSON.stringify(res));
                                        return;
                                    }
                                });
                                }else if(!prevUsers.includes(usr)){
                                    let res = {"status":"Request Action Sucessful. The user does not own this book."};
                                        response.send(JSON.stringify(res));
                                        return;
                                }
                            }else{
                                let res = {"status":"SQL Error Occured"}
                                response.send(JSON.stringify(res)); 
                            }
                        }catch{
                            let res = {"status":"The user does not own this book."}
                            response.send(JSON.stringify(res));
                        }
                    });
                }

            }else{
                let res = {"status":"SQL Error Occured"}
                response.send(JSON.stringify(res));
                return;  
            }
        }catch{
            let res = {"status":"Request Not Found or the action has been taken on the request"}
            response.send(JSON.stringify(res));
            return;
        }
    });
     
});
