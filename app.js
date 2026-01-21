const express= require('express')
const morgan= require('morgan')
require('dotenv').config()
const dbConnect = require('./src/config/db')
const router = require('./src/routes/user.routes')
const walletRoute = require('./src/routes/wallet.routes')
Port=process.env.Port
const app=express()

// register EJS
app.set('view engine', 'ejs')




// Middleware
app.use(express.json())
app.use(morgan('dev'))

// Declaring the Database
dbConnect()

app.get('/',(req, res)=>{

    const blogs=[
        {title:'The Naija', snippet:'There was a country be now'},
        {title:'The Ghana', snippet:'There was a Ghana be now'},
        {title:'The TOgo', snippet:'There was a Togo be now'}

    ]



    res.render('index', {title:'Home', blogs})
})
app.get('/about',(req, res)=>{
    res.status(200).render('about', {title:'About'})
})
app.get('/404',(req, res)=>{
    res.status(404).render('404', {title:'404'})
})
app.get('/create/new',(req, res)=>{
    res.status(201).render('create')
})



app.use('/loan',router )
app.use('/wallet',walletRoute )

app.listen(Port, ()=>{
    console.log('The server is running')

})