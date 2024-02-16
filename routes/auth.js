const express = require('express')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router()
const fs = require('fs')
const User = require('../schemas/user.js')
const privateKey = fs.readFileSync('keys/jwtRS256.key')
const { syntaxErrorValidation } = require('../functions/validation.js')
const { Response_Status } = require('../enum.js')

router.use(express.json())
router.use(syntaxErrorValidation)

router.post('/login', async (req, res) => {
    try{
        if(req.body.username == undefined || req.body.password == undefined) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide username and password in json body'})
        const username = req.body.username.trim()
        const password = req.body.password.trim()
        const user = await User.findOne({ username: username }).lean()
        if(user == null) return res.status(404).json({ status: Response_Status.ERROR, message: 'No match for username and password' })
        const verified = bcrypt.compareSync(password, user.hash)
        if(!verified) return res.status(404).json({ status: Response_Status.ERROR, message: 'No match for username and password' })
        const token = jwt.sign({ username: user.username, id: user._id }, { key: privateKey, passphrase: process.env.JWT_PASSPHRASE }, { algorithm: 'RS256', expiresIn: '1d' })
        res.cookie('authorization', token, { maxAge: 86400000, httpOnly: true, secure: true })
        return res.status(200).json({ status: Response_Status.OK, issuedToken: true })
    }catch(err){
        console.error(err)
        return res.status(err.statusCode).json({ status: Response_Status.ERROR, message: err.message })
    }
})

module.exports = router