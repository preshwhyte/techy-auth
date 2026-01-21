const express= require('express')
const {apply, getAllUsers, getUser, getName, signup, login, verifyOtp, resendOtp, resetPass, forgetPass}= require('../controller/user.controller')
const authenticate = require('../config/auth')
const upload = require('../config/upload')


const router=express.Router()


router.post('/signup',signup)
router.post('/login',login)
router.put('/verify-otp',verifyOtp)
router.put('/resend-otp',resendOtp)
router.put('/forgetpass',forgetPass)
router.put('/resetpass',resetPass)
router.post('/apply',upload.single('image'), apply)
router.get('/get-users',authenticate,getAllUsers)
router.get('/get-user/:id',getUser)
router.get('/get-name',getName)



module.exports=router