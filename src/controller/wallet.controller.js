const user = require("../models/user.models")
const Wallet = require("../models/wallet.models")
const mongoose = require('mongoose')
const Flutterwave = require('flutterwave-node-v3');
const axios = require("axios");
const Transaction = require("../models/transaction.models");


const createWallet = async(req,res)=>{
    try{
    const {userId}= req.user
    const {phoneNumber, currency}= req.body
    if(!userId){
        return res.status(400).json({message:'User id is required'})
    }
    const existingUser= await user.findById(userId)

    if(!existingUser){
         return res.status(400).json({message:'User not found'})
    }

    const normalizedNumber= phoneNumber.replace(/^(\+234|0)/, "")
    
    existingUser.phonenumber=phoneNumber
    await existingUser.save()

    const newWallet= new Wallet({
        userId:userId,
        balance:0,
        currency:currency,
        acctNumber:normalizedNumber
    })

    await newWallet.save()
    return res.status(201).json({message:"wallet created", newWallet})


}catch(e){
    console.log(e)
    return res.status(500).json({message:'server error'})

}
}

const getWallets =async(req,res)=>{
    try{
        const {userId} = req.user
        if(!userId){
            return res.status(400).json({message:'User id is required'})
        }

        const wallets= await Wallet.find().populate('userId')
        return res.status(201).json({wallets})

    }catch(e){
    console.log(e)
    return res.status(500).json({message:'server error'})
    }
}

// const transfer = async(req,res)=>{
//     const {acctFrom, acctTo, amount} = req.body
//     const {userId}= req.user

//     try{
//         if (!userId){
//             return res.status(400).json({message:'user not found'})
//         }
//         if(!acctFrom || !acctTo || !amount){
//             return res.status(400).json({message:'enter all fields'})
//         }

//         const senderWallet= await wallet.findOne({acctNumber:acctFrom})
//         const receiverWallet= await wallet.findOne({acctNumber: acctTo})

//         if(!senderWallet){
//             return res.status(400).json({message:'Sender wallet not seen'})

//         }
//         if(!receiverWallet){
//             return res.status(400).json({message:'receiver account not found'})
//         }

//         if(senderWallet<amount){
//             return res.status(400).json({message:'insufficient funds'})
//         }

//         await wallet.updateOne(
//             {acctNumber:acctFrom},
//             {$inc:{balance:-amount}}
//         )

//         await wallet.updateOne(
//             {acctNumber:acctTo},
//             {$inc:{balance:amount}}
//         )
//         return res.status(200).json({message:'Transfer Successfull'})


//     } catch(e){
//         console.log(e)
//     return res.status(500).json({message:'server error'}) 
//     }
// }



// Transer Funds Between Wallets (Safe without Replica Set)
const transferFunds = async (req, res) => {
  const { accountNumberFrom, accountNumberTo, amount } = req.body;
  const { userId } = req.user;

  if (!userId) {
    return res.status(400).json({ message: "User Must Be Logged In" });
  }

  if (!accountNumberFrom || !accountNumberTo || !amount) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (amount <= 0) {
    return res
      .status(400)
      .json({ message: "Amount must be greater than zero" });
  }

  if (accountNumberFrom === accountNumberTo) {
    return res
      .status(400)
      .json({ message: "Cannot transfer to the same account" });
  }

  try {
    // Step 1: Check if both wallets exist
    const senderWallet = await Wallet.findOne({
      acctNumber: accountNumberFrom,
    });
    const receiverWallet = await Wallet.findOne({
      acctNumber: accountNumberTo,
    });

    if (!senderWallet) {
      return res.status(404).json({ message: "Sender wallet not found" });
    }

    if (!receiverWallet) {
      return res.status(404).json({ message: "Receiver wallet not found" });
    }

    if (senderWallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    // Step 2: Atomic debit from sender (with balance check in query)
    // This ensures we only debit if balance is STILL sufficient
    const debitResult = await Wallet.findOneAndUpdate(
      {
        acctNumber: accountNumberFrom,
        balance: { $gte: amount }, // Only update if balance is enough (prevents race condition)
      },
      { $inc: { balance: -amount } },
      { new: true }
    );

    // If debit failed (someone else spent the money first!)
    if (!debitResult) {
      return res
        .status(400)
        .json({ message: "Insufficient funds or wallet changed" });
    }

    // Step 3: Credit receiver (this should always succeed)
    const creditResult = await Wallet.findOneAndUpdate(
      { acctNumber: accountNumberTo },
      { $inc: { balance: amount } },
      { new: true }
    );

    // If credit somehow failed, refund the sender (rollback manually)
    if (!creditResult) {
      await Wallet.updateOne(
        { acctNumber: accountNumberFrom },
        { $inc: { balance: amount } } // Refund
      );
      return res
        .status(500)
        .json({ message: "Transfer failed, funds returned" });
    }

    return res.status(200).json({
      message: "Transfer successful",
      details: {
        from: accountNumberFrom,
        to: accountNumberTo,
        amount: amount,
      },
    });
  } catch (e) {
    console.error("Error during fund transfer:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};



const CreateRedirectUrl = async(req,res)=>{

    try{
    const {userId}= req.user
    const {amount, currency,acctNumber,redirectUrl} = req.body

    if (!userId){
        return res.status(400).status({ message: "Login to Proceed" })
    }
    if (!amount || !currency || !redirectUrl){
        return res.status(400).status({ message: "Enter all fields" })

    }
    const User= await user.findById(userId)
    if(!User){
        return res.status(400).status({ message: "User not found" })

    }
        // Generate a unique transaction reference
    const txRef = `TX-${Date.now()}-${userId}`;

        // Initialize Flutterwave
    const flw = new Flutterwave(
      process.env.FLW_PUBLIC_KEY,
      process.env.FLW_SECRET_KEY
    );



        // Create payment payload for Flutterwave Standard
    const payload = {
      tx_ref: txRef,
      amount: amount,
      currency: currency,
      redirect_url: redirectUrl,
      customer: {
        email: User.email,
        phonenumber: User.phoneNumber,
        name: User.name,
      },
      customizations: {
        title: "Wallet Funding",
        description: "Fund your wallet",
      },
    };

        // Generate hosted payment link using Flutterwave Standard API
    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    // Update transactions

    const wallet = await Wallet.findOne({acctNumber:acctNumber})
    
    const newTransaction = new Transaction({
      userId:userId,
      walletId: wallet._id,
      refNo:txRef,
      type:"credit" ,
      amount: amount,
      currency: currency,
      balanceAfter:wallet.balance,
      balanceBefore:parseFloat(wallet.balance) + parseFloat(amount),
      desciption:"credit paid ",
      status:"pending"

    })
    await newTransaction.save()


        return res.status(201).json({
      message: "Payment link created successfully",
      paymentLink: response.data.data.link,
      txRef: txRef,
      newTransaction
    });

     } catch(e){
            console.error("Error creating redirect URL:", e);
    return res
      .status(500)
      .json({ message: "Internal server error", error: e.message });

     }
}

// const flutterwaveWebhook = async(req, res)=>{
//   try{
//      // verify webhook signature
//      const secretHash= process.env.FLW_SECRET_HASH
//      const signature= req.headers["verif-hash"]

//      if(!signature || signature !== secretHash){
//       return res.status(400).json({message:'invalid webhook signature', result:'unauthorized'})

//      }

//      const payload = req.body

//      console.log("Flutterwave Webhook Payload:", payload)

//      // check if payment was successful

//      if (payload.data.status === "successful" && payload.event==="charge.completed"){
//       const {tx_ref, amount, currency, id: transactionId} = payload.data
     

//      // verify the transaction with flutterwave
//      const verifyResponse= await axios.get(
//       `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
//       {
//         headers:{
//           Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`
//         }
//       }
//      )

//      console.log('Flutterwave verify responcse:', verifyResponse.data)

//      const verifyData = verifyResponse.data

//      if(
//       verifyData.status==="success" &&
//       verifyData.data.status ==="successful" &&
//       verifyData.data.amount=== amount &&
//       verifyData.data.currency ===currency
//      ){
//       // Extract userId from tx_ref (format: TX-timestamp-userId)
//       const txParts= tx_ref.split('-')
//       const userId = txParts[txParts.length -1]

    

//      // find the transaction record

//      const transactionRecord = await Transaction.findOne({refNo:tx_ref})
//      console.log("User transaction record found:", transactionRecord)

//      // find the Wallet

//      const wallet= await Wallet.findOne({_id:transactionRecord.walletId})
//      console.log("User wallet found:", wallet)

//      if(wallet){
//       await Wallet.findOneAndUpdate(
//       {_id:transactionRecord.walletId},
//       {$inc:{balance:amount}},
//       {new:true}
//       )
//         // Get user for email notification
//           const user = await User.findById(transactionRecord.userId);
//           console.log("User Found for Email Notification:", user);
//           if (user) {
//           // Send success email (optional)
//           console.log(`Wallet funded successfully for user: ${user.email}, Amount: ${amount} ${currency}`);
//         }
//       // Update the transaction status to successful
//       await Transaction.findOneAndUpdate(
//         { refNo: tx_ref },
//         { status: "successful" },
//         { new: true }
//       );

//       return res.status(200).json({ message: "Wallet funded successfully" });
//      }else {
//           console.error("Wallet not found for userId:", userId);
//           return res.status(404).json({ message: "Wallet not found" });
//         }

//  }else {
//         console.error("Transaction verification failed", verifyData);
//         return res.status(400).json({ message: "Transaction verification failed" });
//       }

// }
//     // For other events, just acknowledge receipt
//     return res.status(200).json({ message: "Webhook received" });

//   }catch(e){
//         console.error("Webhook error:", e);
//     return res.status(500).json({ message: "Webhook processing failed- server error" });

//   }
// }

const flutterwaveWebhook = async (req, res) => {
  try {
    const secretHash = process.env.FLW_SECRET_HASH;
    const signature = req.headers["verif-hash"];

    // Verify webhook signature
    if (!signature || signature !== secretHash) {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const payload = req.body;
    console.log("Flutterwave Webhook Payload:", payload);

    // Only process successful charge events
    if (
      payload.event === "charge.completed" &&
      payload.data.status === "successful"
    ) {
      const { tx_ref, amount, currency, id: transactionId } = payload.data;

      // Verify transaction with Flutterwave
      const verifyResponse = await axios.get(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        {
          headers: {
            Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          },
        }
      );

      const verifyData = verifyResponse.data;
      console.log("Flutterwave verify response:", verifyData);

      if (
        verifyData.status === "success" &&
        verifyData.data.status === "successful" &&
        verifyData.data.amount === amount &&
        verifyData.data.currency === currency
      ) {
        const transactionRecord = await Transaction.findOne({ refNo: tx_ref });

        if (!transactionRecord) {
          return res.status(404).json({ message: "Transaction record not found" });
        }

        // Prevent duplicate funding
        if (transactionRecord.status !== "pending") {
          return res.status(200).json({ message: "Transaction already processed" });
        }

        const wallet = await Wallet.findById(transactionRecord.walletId);

        if (!wallet) {
          return res.status(404).json({ message: "Wallet not found" });
        }

        // Credit wallet
        await Wallet.findByIdAndUpdate(
          wallet._id,
          { $inc: { balance: amount } },
          { new: true }
        );

        // Update transaction status
        await Transaction.findOneAndUpdate(
          { refNo: tx_ref },
          { status: "successful" }
        );

        console.log(`Wallet funded: ${amount} ${currency}`);

        return res.status(200).json({ message: "Wallet funded successfully" });
      }

      console.error("Transaction verification failed");
      return res.status(400).json({ message: "Verification failed" });
    }

    // Acknowledge other events
    return res.status(200).json({ message: "Webhook received" });

  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};





module.exports={
    createWallet,
    getWallets,
    transferFunds,
    CreateRedirectUrl,
    flutterwaveWebhook,
}