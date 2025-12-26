
const mongoose=require('mongoose')


const userShema= new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    otp:{
        type:String
    },
    otpExpiry:{
        type:Date
    },
    verify:{
        type:Boolean,
        default:false
    },
    role:{
        type:String,
        enum:['user','admin'],
        default:'user'

    },
    amount:{
        type: Number
    }

},
{
    timestamps:true,
    versionKey:false
})

const user= mongoose.model('user',userShema)

module.exports=user