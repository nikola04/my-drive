const express = require('express')
const router = express.Router()
const { Response_Status } = require('../enum.js')
const fs = require('fs')
const path = require("path")
const fileRoute = require('./file.js')
const folderRoute = require('./folder.js')
const { apiAuth } = require('../functions/authenticate.js')
const { syntaxErrorValidation } = require('../functions/validation.js')

router.use(express.json())
router.use(syntaxErrorValidation)
router.use(apiAuth)
router.use('/folder', folderRoute)
router.use('/file', fileRoute)

const getAllFiles = function(dirPath) {
    const files = fs.readdirSync(dirPath)
    const file_array = []
  
    files.forEach(function(file) {
        file_array.push(path.join(dirPath, file))
    })
  
    return file_array
}
  
const getTotalSize = function(directoryPath) {
    const file_array = getAllFiles(directoryPath)
  
    const total_size = file_array.reduce((acc, curr) => acc + fs.statSync(curr).size, 0)
    return total_size
}

router.get('/memory', (req, res) => {
    const used = getTotalSize('uploads/') // calculate size of all files
    const total = 21474836480
    res.json({ status: Response_Status.OK, used, total })
})

module.exports = router