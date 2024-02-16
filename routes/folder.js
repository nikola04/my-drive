const express = require('express')
const { isValidObjectId } = require('mongoose')
const { Response_Status } = require('../enum.js')
const router = express.Router()

const File = require('../schemas/file.js')

router.post('/', async (req, res) => {
    try{
        if(req.body == undefined || req.body.name == undefined) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide name and parrent directory'})
        const name = req.body.name.trim()
        if(name.length < 2) return res.status(422).json({ status: Response_Status.ERROR, message: 'Provide valid name of directory'})
        const parent = req.body.parent
        let parent_id = null
        if(parent != null && isValidObjectId(parent)){
            const parent_folder = await File.findOne({ _id: parent, owner_id: req.user, deleted: false, folder: true }).lean()
            if(parent_folder == null) return res.status(422).json({ status: Response_Status.ERROR, message: 'Parent directory does not exists'})
            parent_id = parent_folder._id
        }
        const folder = await File.create({
            name,
            parent: parent_id,
            owner_id: req.user,
            folder: true,
            meta: {
                name,
                size: null,
                tags: [name],
                updated: Date.now()
            }
        })
        return res.status(200).json({ status: Response_Status.OK, folder })
    }catch(err){
        console.error(err)
        return res.status(err.statusCode).json({ status: Response_Status.ERROR, message: err.message })
    }
})

const findPathToFolder = async (folder) => {
    const path = []
    path.push({ name: folder.name, id: folder._id })
    if(folder.parent == null) return ({ path, more: false })
    const parent = await File.findOne({ _id: folder.parent, deleted: false, folder: true }).lean()
    if(parent == null) return ({ path: [], more: false }) // u slucaju greske
    path.push({ name: parent.name, id: parent._id })
    if(parent.parent == null) return ({ path, more: false })
    return ({ path, more: true })
}

router.get('/:id', async (req, res) => {
    const owner_id = req.user
    let parent = null
    let path = { path: [], more: false }
    if(req.params.id != 'home'){
        if(!isValidObjectId(req.params.id)) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provide a valid parrent directory' })
        const folder = await File.findOne({ _id: req.params.id, folder: true, deleted: false }).lean()
        if(!folder) return res.status(400).json({ status: Response_Status.ERROR, message: 'Provided directory doesnt exists' })
        if(folder.owner_id != owner_id) return res.status(401).json({ status: Response_Status.ERROR, message: 'You dont have permission to view this directory' })
        path = await findPathToFolder(folder)
        parent = folder._id
    }
    try{
        const files = await File.find({ owner_id, parent, deleted: false }).lean()
        res.json({ status: Response_Status.OK, files, path })
    }catch(err){
        console.log(err)
        return res.status(err.statusCode).json({ status: Response_Status.ERROR, message: err.message })
    }
})


module.exports = router