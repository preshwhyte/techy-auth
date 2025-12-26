const express= require('express')
const morgan= require('morgan')
require('dotenv').config()
const dbConnect = require('./src/config/db')
const router = require('./src/routes/user.routes')
Port=process.env.Port
const app=express()



// Middleware
app.use(express.json())
app.use(morgan('dev'))

// Declaring the Database
dbConnect()

app.use('/loan',router )

app.listen(Port, ()=>{
    console.log('The server is running')

})