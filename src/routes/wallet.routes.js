const authenticate = require('../config/auth')
const { createWallet, getWallets, transferFunds, CreateRedirectUrl, flutterwaveWebhook,  } = require('../controller/wallet.controller')

const walletRoute= require('express').Router()


walletRoute.post('/create-wallet',authenticate,createWallet)
walletRoute.get('/get-wallet',authenticate,getWallets)
walletRoute.post('/transfer',authenticate,transferFunds)
walletRoute.post('/flutter',authenticate,CreateRedirectUrl)
walletRoute.post('/webhook',flutterwaveWebhook)

module.exports= walletRoute