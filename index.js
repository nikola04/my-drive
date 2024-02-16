const express = require('express');
const app = express();
const mongodb = require('mongoose');
require('dotenv/config')
const apiRoute = require('./routes/api.js')
const authRoute = require('./routes/auth.js')
const { authenticate } = require('./functions/authenticate.js')

// mongodb.connect(process.env.MONGO_CONN);
app.use(express.static('public'))

app.use('/api/', apiRoute)
app.use('/auth', authRoute)

app.get('/', (req, res) => {
    res.redirect('/drive/home')
})

app.get('/drive', (req, res) => {
    res.redirect('/drive/home')
})

app.get('/drive/:folder_id', authenticate, async (req, res) => {
    if(!req.user) return res.redirect('/login')
    const user = { id: req.user._id, username: req.user.username, email: req.user.email, icon: req.user.icon }
    return res.render('index.ejs', { user });
})

app.get('/login', authenticate, (req, res) => {
    res.render('login.ejs');
})
app.get('/logout', authenticate, (req, res) => {
    // remove token from db
    res.cookie('authorization', '', { maxAge: -1, httpOnly: true, secure: true })
    res.redirect('/login');
})

app.listen(80);