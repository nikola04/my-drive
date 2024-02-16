const express = require('express')
const { isValidObjectId } = require('mongoose')
const fs = require('fs')
const File = require('../schemas/file.js')
const { File_Patch_Type, Response_Status } = require('../enum.js')
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const router = express.Router()

router.get('/:file_id?', async (req, res) => {
    if(req.params.file_id == null) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide file or files array'})
    if(!isValidObjectId(req.params.file_id)) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide a valid file id'})
    const file_id = req.params.file_id
    const file = await File.findOne({ _id: file_id, folder: false })
    if(file == null) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide a valid file id'})
    if(file.owner_id != req.user) return res.status(401).json({ status: Response_Status.ERROR, message: 'You dont have permission to download this file' })
    res.header('Content-Disposition', 'attachment')
    res.header('filename', file.meta.name)
    return res.download('E:\\NodeJS Projects\\FileSystem\\uploads\\' + file.name, file.meta.name)
})

router.patch('/:file_id?', async (req, res) => {
    try{
        if(req.body.patch_type != File_Patch_Type.DELETE) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide a valid patch type'})
        if(req.params.file_id == null && req.body.files == null) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide file or files array'})
        const files = []
        if(req.params.file_id != null) {
            if(!isValidObjectId(req.params.file_id)) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide a valid file id'})
            files.push(req.params.file_id)
        }else{
            if(!Array.isArray(req.body.files)) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide a valid array of file ids'})
            req.body.files.forEach(file => {
                if(isValidObjectId(file)) files.push(file)
            })
            if(files.length == 0) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide at least one file with valid id'})
        }
        const set = { deleted: true }
        const files_formated = files.map(file => ({ _id: file }))
        const updated = await File.updateMany({ $or: files_formated, owner_id: req.user }, { $set: set }).lean()
        return res.json({ status: Response_Status.OK, updated: files, forceReload: files.length != updated.modifiedCount })
    }catch(err){
        // console.error(err)
        return res.status(err.statusCode).json({ status: Response_Status.ERROR, message: err.message })
    }
})

router.post('/', upload.array('files[]'), async (req, res) => {
    try{
        if(!req.body.parent_id) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide parent directory'})
        if(req.files.length == 0) return res.status(400).json({ status: Response_Status.ERROR, message: 'No files specified'})
        const owner_id = req.user
        let parent = null
        if(req.body.parent_id != 'home'){
            if(!isValidObjectId(req.body.parent_id)) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide a valid parent id'})
            const folder = await File.findOne({ _id: req.body.parent_id, folder: true, deleted: false }).lean()
            if(!folder) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provided directory doesnt exists' })
            if(folder.owner_id != owner_id) return res.status(401).json({ status: Response_Status.ERROR, message: 'You dont have permission to upload in this directory' })
            parent = folder._id
        }
        const formated = req.files.map(file => {
            const name_splitted = file.originalname.split('.')
            const extension = name_splitted.length > 1 ? name_splitted[name_splitted.length - 1] : null
            const tags = [file.originalname, extension]
            return ({ 
                name: file.filename,
                owner_id,
                parent,
                folder: false,
                meta: {
                    name: file.originalname,
                    size: file.size,
                    tags,
                    updated: Date.now()
                }
            })
        })
        const created = await File.create(formated)
        return res.json({ status: Response_Status.OK, files: created })
    }catch(err){
        console.log(err)
        return res.status(err.statusCode).json({ status: Response_Status.ERROR, message: err.message })
    }
})

module.exports = router