const User = require("../models/user.models")
const bcrypt= require('bcryptjs')

const jwt=require("jsonwebtoken")
const sendEmail = require("../config/email")



const signup= async(req, res)=>{
    const {name,email,password}= req.body
    try{
        if(!name || !email || !password){
            return res.status(400).json({message:'fill all fields'})
        }
        const existingEmail= await User.findOne({email})
        if(existingEmail){
            return res.status(400).json({message:'user already exist'})
        }

        const hashpass= await bcrypt.hash(password,10)
        const otp= Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry2= new Date(Date.now() +3 *60 *1000);

        const user = new User({
            name,
            email,
            password:hashpass,
            otp:otp,
            otpExpiry:otpExpiry2
        })
        await user.save()
        await sendEmail(
            email,
            "Account Verification",
            `Welcome to thunderclient Intl, please confirm your account with the otp- ${otp}`

        )
        return res.status(201).json({message:"user created successfully",otp})

    }catch(e){

            console.log(e)
        return res.status(500).json({message:"server error"})
    }
}

const verifyOtp= async(req,res)=>{
    const {otp}=req.body
    try{
        if(!otp){
          return res.status(400).json({message:"input the otp"})  
        }
        const user= await User.findOne({otp})
        if(!user){
             return res.status(400).json({message:"invalid otp"}) 
        }
        if(user.otpExpiry < new Date()){
            return res.status(400).json({message:"otp expired"})
        }

        user.verify=true
         user.otp=null
         user.otpExpiry=null
         await user.save()
         return res.status(200).json({message:"otp confirmed successfully"}) 



    }catch(e){

            console.log(e)
        return res.status(500).json({message:"server error"})
    }
}
const resendOtp= async(req,res)=>{
    const {email} =req.body
    try{
        if (!email){
            res.status(400).json({message:"please enter your email address"})
        }
        const user= await User.findOne({email})
        if (!user){
            res.status(400).json({message:"you are not a user"})
        }
        const otp= Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry2= new Date(Date.now() +3 *60 *1000);

        user.otp=otp
        user.otpExpiry=otpExpiry2
        user.save()
        return res.status(200).json({message:"otp resent successfully", otp})



    }catch(e){
        console.log(e)
        return res.status(500).json({message:"server error"})
    }
}

const forgetPass =async(req,res)=>{
    const {email}= req.body
    try{
       if (!email){
           return res.status(400).json({message:"enter email address"}) 
        }
        const user= await User.findOne({email})
        if(!user){
            return res.status(400).json({message:"user not seen"})
        }
        const otp= Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry2= new Date(Date.now() +3 *60 *1000);

        user.otp=otp
        user.otpExpiry=otpExpiry2
        await user.save()
        return res.status(200).json({message:"otp sent successfully", otp})

    }catch(e){
        console.log(e)
        return res.status(500).json({message:"server error"})
    }
}

const resetPass= async(req,res)=>{
    const {otp,newpass} = req.body
    try{
        if(!otp || !newpass){
            return res.status(400).json({message:"enter all fields"})

        }
        const user= await User.findOne({otp})
        if(!user){
            return res.status(400).json({message:"otp is not correct or not user"})
        }

        if(user.otpExpiry< new Date()){
            return res.status(400).json({message:"otp expired"})
        }

        const hasspass= await bcrypt.hash(newpass,10)

        user.password=hasspass
        user.otp=null
        user.otpExpiry=null
        await user.save()
        return res.status(200).json({message:"password reset successfully"})


    }catch(e){
        console.log(e)
        return res.status(500).json({message:"server error"})
    }
}

const login= async(req,res)=>{
    const {email, password}= req.body
    try{
        if(!email || !password){
            return res.status(400).json({message:"all field is reqiured"}) 
        }
        const user= await User.findOne({email})
        if (!user){
            return res.status(400).json({message:"user not found please signup"}) 
        }

        const comparepass= await bcrypt.compare(password,user.password)
        if(!comparepass){
            return res.status(400).json({message:"password is incorrect"}) 
        }

        if (!user.verify){
            return res.status(400).json({message:"your account is not verified"}) 
        }

        const token= await jwt.sign({userId:user._id, role:user.role},process.env.JWT_SECRET, {expiresIn:"1h" })
        return res.status(200).json({message:"login successfuly", token}) 



    }catch(e){
        console.log(e)
        return res.status(500).json({message:"server error"}) 
    }
}


const apply= async(req,res)=>{
    const {name,email,amount}=req.body

    try{
        if(!name || !email || !amount){
            return res.status(400).json({message:"input the fields"})
        }
        const existingEmail= User.findOne({email})
        if(existingEmail){
            return res.status(400).json({message:"user already exist"})
        }

        const newuser= new User({name,email,amount})
        
        await newuser.save()
        return res.status(200).json({message:"applied successfully"})

    }catch(e){
        console.log(e)
        return res.status(500).json({message:"server error"})

    }
}

const getAllUsers= async(req, res)=>{
    const {role}=req.user

    if(role !== "admin"){
        return res.status(400).json({message:"Access denied not the user"})

    }
    try{
        const user = await User.find().select('-password -otp ')
        return res.status(200).json(user,{message:"here we go"})

    }catch(e){
        console.log(e)
        return res.status(500).json({message:"server error"})
    }
}

const getUser= async(req,res)=>{
    const {id}= req.params
    try{
        const user= await User.findById(id)
        if (!user){
            return res.status(400).json(user,{message:"user not found"})
        }
        return res.status(200).json(user)

    }catch(e){
     console.log(e)
        return res.status(500).json({message:"server error"})
    }
}
const getName= async(req,res)=>{
    try{
        const {name}=req.query
        const user= await User.findOne({name})
         if (!user){
            return res.status(400).json(user,{message:"user not found"})
        }
        return res.status(200).json(user)


    }catch(e){
            console.log(e)
        return res.status(500).json({message:"server error"}) 
    }
    



}

module.exports={
    signup,
    login,
    apply,
    getAllUsers,
    getUser,
    getName,
    verifyOtp,
    resendOtp,
    forgetPass,
    resetPass,

}