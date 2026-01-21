const mongoose= require('mongoose')


const walletSchema= new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    balance:{
        type:mongoose.Schema.Types.Decimal128,
        default:0
    },
    currency:{
        type:String,
        required:true,
        default:'NGN'
    },
    acctNumber:{
        type:String,
        required:true,
        unique:true
    }
},
{
    timestamps:true,
    versionKey:false
})


const wallet= mongoose.model('wallet',walletSchema)

module.exports= wallet