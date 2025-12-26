const jwt=require("jsonwebtoken")

const authenticate= (req,res,next)=>{
    const token= req.header('Authorization')?.replace('Bearer ','')
    if(!token){
         return res.status(400).json({message:'No token Authorization, denied'})
    }
    try{
        const decoded= jwt.verify(token,process.env.JWT_SECRET)
        req.user=decoded
        next()

    }catch(e){
        console.log(e)
        return res.status(500).json({message:' server error'})
    }
    
}

module.exports= authenticate