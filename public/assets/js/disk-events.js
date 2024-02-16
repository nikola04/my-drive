HTMLElement.prototype.fadeIn = function(display = 'block', callback = () => {}){
    this.addEventListener('transitionend', function tend(){
        this.removeEventListener('transitionend', tend)
        callback()
    })
    this.style.display = '0'
    this.style.display = display
    setTimeout(() => {
        this.style.opacity = '1'
    }, 1)
}
HTMLElement.prototype.fadeOut = function(callback = () => {}){
    if(this.style.opacity == '0') return
    this.addEventListener('transitionend', function tend(){
        this.removeEventListener('transitionend', tend)
        this.style = ''
        callback()
    })
    this.style.opacity = '0'
}

const File_Patch_Type = {
    DELETE: 'delete'
}

addEventListener('load', e => {
    const button = document.querySelector('button#button-new')
    const context_menu = document.querySelector('div#context-menu')
    const app = document.querySelector('#app')

    app.addEventListener('contextmenu', e => e.preventDefault()) // remove context menu
    addEventListener('click', e => {
        hideContextMenu(() => {}, true)
        tryCloseNavModals()
    })

    document.querySelectorAll('.nav-popup-box').forEach(popup => popup.addEventListener('click', e => e.stopPropagation())) // profile popup modal
    context_menu.addEventListener('click', e => e.stopPropagation()) // custom context menu
    button.addEventListener('click', e => {
        e.stopPropagation()
        const button_position = button.getBoundingClientRect()
        const menu_position = { x: button_position.x, y: button_position.top + button_position.height + 3 }
        showContextMenu(menu_position, MenuType.NOTHING_SELECTED)
    })

    document.querySelectorAll('[data-button-type="modal-button"]').forEach(button => button.addEventListener('click', e => {
        e.stopPropagation()
        const popup = button.parentNode.querySelector('.nav-popup-box')
        if(button.parentNode.classList.contains('active')) {
            popup.fadeOut()
            popup.parentNode.classList.remove('active')
        }else{ 
            popup.fadeIn('flex')
            document.querySelectorAll('.nav-popup-box').forEach(_popup => {
                if(_popup == popup || !_popup.parentNode.classList.contains('active')) return;
                _popup.fadeOut()
                _popup.parentNode.classList.remove('active')
            })
            popup.parentNode.classList.add('active')
        }
    }))

    // File upload
    document.querySelector('#file-upload').addEventListener('change', async e => {
        const files = e.target.files
        if(files.length == 0) return
        const parent_id = getFolderIdFromPath(location.href)
        const formdata = new FormData()
        for(let i = 0; i < files.length; i++){
            formdata.append('files[]', files[i])
        }
        formdata.append('parent_id', parent_id)
        uploadFiles(formdata)
    })
})

const openFolder = async () => {
    const item_ids = getSelectedItems()
    if(item_ids.length == 0) return console.error('0 selected items')
    goToFolder(item_ids[0])
    hideContextMenu()
}

const uploadFiles = async (body) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/file', true);
    // xhr.setRequestHeader(`Content-Type", "multipart/form-data; boundary=${body.getBoundary()}`);
    xhr.upload.addEventListener('progress', e => {
        console.log(`Uploading (${((e.loaded / e.total) * 100).toFixed(2)}%)…`)
    })
    xhr.addEventListener('load', e => {
        if(xhr.readyState != 4 || xhr.status != 200) return
        updateMemory()
        const data = JSON.parse(xhr.response)
        const formated = formatFiles(...data.files)
        formated.forEach(file => {
            const item = createItemElement(file)
            document.querySelector('#items').appendChild(item)
        })
    })

    xhr.send(body);
}

let shown_menu = false

const hideContextMenu = (callback = () => {}, force = false) => {
    if(!shown_menu && !force) return
    const context_menu = document.querySelector('div#context-menu')
    if(context_menu.style.opacity == '') return
    context_menu.addEventListener('transitionend', function tend(){
        context_menu.removeEventListener('transitionend', tend)
        context_menu.style = ''
        callback()
        shown_menu = false
    })
    context_menu.style.opacity = '0'
}

const showContextMenu = ({ x, y }, selected_type) => {
    const context_menu = document.querySelector('div#context-menu')
    const hideMenu = () => {
        context_menu.style.left = x + 'px'
        context_menu.style.top = y + 'px'
        context_menu.style.display = 'flex'
        setTimeout(() => {
            context_menu.querySelectorAll('[data-menu-type]').forEach(menu => {
                if(menu.dataset.menuType == selected_type) return menu.classList.add('active')
                menu.classList.remove('active')
            })
            context_menu.style.opacity = 1;
        }, 1)
    }
    if(shown_menu) hideContextMenu(hideMenu)
    else hideMenu()
    shown_menu = true
}

let disable_create_folder = false
const createNewFolder = async (name, parent) => {
    if(disable_create_folder) return
    disable_create_folder = true
    const loader = document.querySelector('#new-folder-submit-loader')
    loader.classList.add('active')

    await fetch('/api/folder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, parent })
    }).then(async res => {
        if(res.ok) return await res.json()
        return null
    }).then(data => {
        const item = createItemElement(formatFiles(data.folder)[0])
        document.querySelector('#items').appendChild(item)
    }).catch(err => {
        console.error(err)
        return null
    }).finally((data) => {
        loader.classList.remove('active')
        closeCustomPrompt()
        disable_create_folder = false
    })
}

const promptCreateNewFolder = () => {
    customPrompt(PrompType.NEW_FOLDER, (value) => {
        // get parent from url
        const folder_id = getFolderIdFromPath(location.href)
        const parent = folder_id == 'home' ? null : folder_id
        createNewFolder(value, parent)
    })
    hideContextMenu()
}
const promptRename = () => {
    customPrompt(PrompType.RENAME, (value) => {
        console.log(value)
    })
    hideContextMenu()
}

const getSelectedItems = () => {
    const selected_items = document.querySelector('#items').querySelectorAll('.item.active')
    const item_ids = []
    selected_items.forEach(item => item_ids.push(item.dataset.id))
    return item_ids
}

const deleteFiles = async () => {
    const item_ids = getSelectedItems()
    if(item_ids.length == 0) return console.error('0 selected items')
    hideContextMenu()
    await fetch('/api/file', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ patch_type: File_Patch_Type.DELETE, files: item_ids })
    }).then(res => res.json())
    .then(data => {
        if(data.status != 'OK') return console.error(data.message)
        if(data.forceReload == true) return loadItemsFromFolder()
        const items_to_remove = data.updated
        document.querySelector('#items').querySelectorAll('.item').forEach(item => {
            if(items_to_remove.includes(item.dataset.id)) item.remove()
        })
    })
}

const downloadFile = async (item_id = null) => {
    if(item_id == null){
        const selected = getSelectedItems()
        if(selected.length == 0) return console.error('0 selected items')
        item_id = selected[0]
    }
    hideContextMenu()
    
    window.location.href = `/api/file/${item_id}`
}
const tryCloseNavModals = () => {
    const popups = document.querySelectorAll('.nav-popup-box')
    popups.forEach(popup => {
        if(!popup.parentNode.classList.contains('active')) return
        popup.fadeOut()
        popup.parentNode.classList.remove('active')
    })
}