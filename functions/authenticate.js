const cookieParser = require('./cookieparser.js')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const User = require('../schemas/user.js')
const publicKey = fs.readFileSync('keys/jwtRS256.key.pub')

const findAuthCookie = (cookies) => {
    for(let i = 0; i < cookies.length; i++){
        if(cookies[i].name == 'authorization'){
            return cookies[i].value
        }
    }
    return null
}

module.exports = {
    apiAuth: (req, res, next) => {
        try{
            const cookies = cookieParser(req.headers.cookie)
            const auth_cookie = findAuthCookie(cookies)
            if(auth_cookie == null) return res.status(401).json({ status: 'ERROR', message: 'Missing authorization token' })
            const decoded = jwt.verify(auth_cookie, publicKey, { algorithms: 'RS256'})
            if(!decoded) return res.status(401).json({ status: 'ERROR', message: 'Error while decoding jwt token' })
            req.user = decoded.id
            next()
        }catch(err){
            return res.status(401).json({ status: 'ERROR', message: err.message })
        }
    },
    authenticate: async (req, res, next) => {
        try{
            const cookies = cookieParser(req.headers.cookie)
            const auth_cookie = findAuthCookie(cookies)
            if(auth_cookie == null) {
                req.user = null
                return next()
            }
            const decoded = jwt.verify(auth_cookie, publicKey, { algorithms: 'RS256'})
            if(!decoded) {
                req.user = null
                return next()
            }
            const user = await User.findOne({ _id: decoded.id }).lean()
            if(user == null) {
                // bad cookie
                req.user = null
                res.cookie('authorization', '', { maxAge: -1, httpOnly: true, secure: true })
            }else req.user = user
            next()
        }catch(err){
            console.error(err)
            req.user = null
            next()
        }
    }
}