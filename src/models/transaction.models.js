const mongoose= require('mongoose')

const tranSchema= new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    walletId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'wallet',
        required:true
    },
    refNo:{
        type:String,
        required:true,
        unique:true
    },
    type:{
        type:String,
        enum:['debit','credit','transfer',],
        reqiured:true
    },
    amount:{
        type:mongoose.Schema.Types.Decimal128,
        required:true
    },
    currency:{
        type:String,
        required:true,
        default:'NGN',
    },
    balanceAfter:{
        type:mongoose.Schema.Types.Decimal128,
        required:true

    },
    balanceBefore:{
        type:mongoose.Schema.Types.Decimal128,
        required:true
    },
    desciption:{
        type:String,
        default: ''
    },
    status:{
        type:String,
        enum:['pending','completed','failed'],
        default:'pending'
    }
})

const transaction= mongoose.model('transaction',tranSchema)

module.exports=transaction