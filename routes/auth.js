const express = require('express');
const router = express.Router()
const mongoose = require('mongoose');

const User = mongoose.model("User")

const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../config/keys')

const requireLogin = require('../middleware/requireLogin')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')
const { SENDGRID_API, EMAIL } = require('../config/keys')

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: SENDGRID_API
    }
}))

router.post('/signup', (req, res) => {
    const { name, email, password, pic } = req.body
    if (!email || !name || !password) {
        res.status(422).json({ error: "please fill all fields" })
    }
    User.findOne({ email: email })
        .then((savedUser) => {
            if (savedUser) {
                res.status(422).json({ error: "user already exist " })
            }
            bcrypt.hash(password, 12)
                .then(hashedpassword => {
                    const user = new User({
                        email,
                        password: hashedpassword,
                        name,
                        pic
                    })

                    user.save()
                        .then(user => {
                            transporter.sendMail({
                                to: user.email,
                                from: "soumendubedi@gmail.com",
                                subject: "signup success",
                                html: "<h1>Welcome to instaclone</h1>"
                            })
                            res.json({ message: "user created successfully" })
                        })
                        .catch(err => {
                            console.log(err)
                        })
                })

        })
        .catch(err => {
            console.log(err)
        })
})

router.post('/signin', (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(422).json({ error: "please provide email or password" })
    }
    User.findOne({ email: email })
        .then(savedUser => {
            if (!savedUser) {
                return res.status(422).json({ error: "Invalid credentials" })
            }
            bcrypt.compare(password, savedUser.password)
                .then(doMatch => {
                    if (doMatch) {
                        //res.json({ message: "signin success" })
                        const token = jwt.sign({ _id: savedUser._id }, JWT_SECRET)
                        const { _id, name, email, followers, following, pic } = savedUser
                        res.json({ token: token, user: { _id, name, email, followers, following, pic } })
                    }
                    else {
                        return res.status(422).json({ error: "Invalid credentials" })
                    }
                })
                .catch(err => {
                    console.log(err)
                })
        })
})

router.post('/reset-password', (req, res) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err)
        }
        const token = buffer.toString("hex")
        User.findOne({ email: req.body.email })
            .then(user => {
                if (!user) {
                    return res.status(422).json({ error: "User not found" })
                }
                user.resetToken = token
                user.expireToken = Date.now() + 3600000
                user.save().then((result) => {
                    transporter.sendMail({
                        to: user.email,
                        from: "soumendubedi@gmail.com",
                        subject: "password reset",
                        html: `
                    <p>You have requested for password reset</p>
                    <h5>click on this <a href="${EMAIL}/reset/${token}">Link</a> to reset password</h5>
                    `
                    })
                    res.json({ message: "check your email to reset password" })
                })
            })
    })
})

router.post('/new-password', (req, res) => {
    const newPassword = req.body.password
    const sentToken = req.body.token
    User.findOne({ resetToken: sentToken, expireToken: { $gt: Date.now() } })
        .then(user => {
            if (!user) {
                return res.status(422).json({ message: "session expired" })
            }
            bcrypt.hash(newPassword, 12).then(hashedpassword => {
                user.password = ha
                user.resetToken = undefined
                user.expireToken = undefined
                user.save().then((savedUser) => {
                    res.json({ message: "password successfully updated" })
                })
            })
        }).catch(err => {
            console.log(err)
        })
})

module.exports = router