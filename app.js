const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' }); //PUT CONFIG.ENV IN .GITIGNORE WITHOUT FAIL
const cors = require('cors');
const express = require('express');
const app = express();
const mongoose = require('mongoose');

const PORT = process.env.PORT;

//TO convert data to json format
app.use(express.json());
app.use(cors()); //Bypass CORS error
//Including database connection file
require('./db/conn');

// const User=require('./model/userSchema');

app.use(cookieParser());
//Routes are handled in auth.js
app.use(require('./router/auth'));

app.listen(PORT, () => {
  console.log(`server running at ${PORT}`);
});
