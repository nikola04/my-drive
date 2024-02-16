const MenuType = {
    NOTHING_SELECTED: 0,
    FILE_SELECTED: 1,
    FOLDER_SELECTED: 2
}
const PrompType = {
    NEW_FOLDER: 0,
    RENAME: 1
}

const checkParentRecursive = (target) => {
    if(target.parentNode == null) return null
    if(target.classList.contains('item')) return target
    return checkParentRecursive(target.parentNode)
}

const updateMemory = async () => {
    const data = await fetch('/api/memory').then(async res => {
        if(res.ok) return await res.json()
        return null
    })

    if(data == null) return
    const used = convertSizeFromBytes(data.used).join(' ')
    const total = convertSizeFromBytes(data.total).join(' ')
    const perc = (data.used / data.total) * 100
    
    document.querySelector('#total-space').innerText = total
    document.querySelector('#used-space').innerText = used
    document.querySelector('#used-space-perc').style.width = perc < 1 ? '1%' : perc.toFixed(2) + '%'
}

addEventListener('load', async () => {
    updateMemory()
    loadItemsFromFolder()

    const items_table = document.querySelector('div#items')
    const files = document.querySelector('div#files')
    files.addEventListener('click', (e) => {
        const item = checkParentRecursive(e.target)
        setActiveItem(items_table, item)
    })
    files.addEventListener('contextmenu', (e) => {
        const item = checkParentRecursive(e.target)
        setActiveItem(items_table, item)
        showContextMenu({ x: e.clientX, y: e.clientY }, (item != null && !item.classList.contains('heading')) ? ( item.dataset.folder === 'true' ? MenuType.FOLDER_SELECTED : MenuType.FILE_SELECTED) : MenuType.NOTHING_SELECTED)
        // show right click menu
    })
})

addEventListener("popstate", (event) => {
    const folder_id = getFolderIdFromPath(document.location)
    goToFolder(folder_id, false)
})

const loadItemsFromFolder = async () => {
    const items_table = document.querySelector('div#items')
    items_table.innerHTML = ''
    document.querySelector('div#file-loader').classList.remove('loaded')
    const folder_id = getFolderIdFromPath(location.href)
    const [files, dir_path] = await getItemsFromFolder(folder_id)
    const items = formatFiles(...files)
    updatePath(dir_path)
    parseItems(items_table, items)
    document.querySelector('div#file-loader').classList.add('loaded')
}

const getFolderIdFromPath = (link) => {
    const url = new URL(link)
    const path = url.pathname.split('/drive')[1]
    const _path = path.split('/')
    const id = _path.length > 1 ? _path[1] : ''
    return id
}

const getItemsFromFolder = async (folder) => {
    const data = await fetch(`/api/folder/${folder}`, {
        method: 'GET'
    }).then(async res => {
        if(res.ok) return await res.json()
        return { files: [], path: [] }
    }).catch(err => {
        console.error(err)
        return { files: [], path: { path: [], more: false } }
    })
    if(data.files) return [data.files, data.path]
    return [[], []]
}

const createPathElement = (id, name, link = true) => {
    const folder = document.createElement('div')
    folder.setAttribute('data-id', id)
    folder.classList.add('folder')
    const p = document.createElement('p')
    p.innerText = name
    folder.appendChild(p)
    if(link) folder.addEventListener('click', e => {
        goToFolder(id)
    })
    return folder
}

const updatePath = (dir_path) => {
    const path_container = document.querySelector('#path')
    const path = dir_path.path.reverse()
    path_container.innerHTML = ''
    path_container.appendChild(createPathElement('home', 'Početna'))
    if(path.length == 0) return
    if(dir_path.more === true) path_container.appendChild(createPathElement(null, '...', false))
    path.forEach((dir, i) => {
        const element = createPathElement(dir.id, dir.name, i != path.length - 1)
        path_container.appendChild(element)
    })
}

const convertSizeFromBytes = (bytes) => {
    let i = 0
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    while(bytes >= 1024){
        bytes /= 1024;
        i++;
        if(i + 1 == units.length) break;
    }
    const bytes_two_digit = bytes.toFixed(2) * 100 / 100
    return [bytes_two_digit, units[i]]
}

const formatFiles = (...files) => {
    const formated = []
    files.forEach(file => {
        const size = file.folder ? '-' : convertSizeFromBytes(file.meta?.size).join(' ')
        formated.push({
            id: file._id,
            name: file.meta.name,
            folder: file.folder,
            size,
            tags: file.meta.tags,
            update_date: file.meta.updated
        })
    })
    return formated
}

const setActiveItem = (items_table, element) => {
    items_table.querySelectorAll('div.item').forEach(item => {
        if(item == element) return element.classList.add('active')
        item.classList.remove('active');
    })
}

const goToFolder = (folder_id, pushState = true) => {
    const state = { folder_id: folder_id };
    const url = new URL(location.href)
    url.pathname = '/drive/' + folder_id
    if(pushState) history.pushState(state, "", url.href);
    return loadItemsFromFolder()
}

const parseItems = (items_table, items) => {
    if(items.length == 0){
        // write no files in this folder
        return
    }
    items.forEach(item => {
        const element = createItemElement(item)
        items_table.appendChild(element)
    })
}

const getIconForType = (type) => {
    if(type == 'txt') return 'bxs-file-txt.svg'
    if(type == 'folder') return 'bx-folder.svg'
    return 'bx-file.svg'
}

const createItemElement = (item) => {
    const item_div = document.createElement('div')
    item_div.classList.add('item')
    item_div.dataset.folder = item.folder
    item_div.dataset.id = item.id
    //
    const icon = document.createElement('div')
    icon.classList.add('icon')
    icon.classList.add('item-box')
    const div_icon = document.createElement('div');
    const img = document.createElement('img')
    img.setAttribute('src', '/images/' + (item.folder ? 'bx-folder.svg' : getIconForType(item.type)))
    div_icon.appendChild(img)
    icon.appendChild(div_icon)
    item_div.appendChild(icon)
    // 
    const name = document.createElement('div')
    name.classList.add('name')
    name.classList.add('item-box')
    const div_name = document.createElement('div')
    const span_name = document.createElement('span')
    span_name.innerText = item.name
    div_name.appendChild(span_name)
    name.appendChild(div_name)
    item_div.appendChild(name)
    // 
    const size = document.createElement('div')
    size.classList.add('size')
    size.classList.add('item-box')
    const div_size = document.createElement('div')
    const span_size = document.createElement('span')
    span_size.innerText = item.size
    div_size.appendChild(span_size)
    size.appendChild(div_size)
    item_div.appendChild(size)
    // 
    const date = document.createElement('div')
    date.classList.add('date')
    date.classList.add('item-box')
    const div_date = document.createElement('div')
    const span_date = document.createElement('span')
    const date_obj = new Date(item.update_date)
    span_date.innerText = date_obj.toLocaleDateString()
    div_date.appendChild(span_date)
    date.appendChild(div_date)
    item_div.appendChild(date)
    item_div.addEventListener('dblclick', e => {
        if(item.folder) return goToFolder(item.id)
        return downloadFile(item.id)
    })
    return item_div;
}

const closeCustomPrompt = () => {
    const prompt = document.querySelector('div#prompt')
    prompt.addEventListener('transitionend', function tEnd(){
        prompt.style = ''
        prompt.removeEventListener('transitionend', tEnd)
    })
    prompt.style.opacity = 0
}

const customPrompt = (type, callback = () => {}) => {
    const prompt = document.querySelector('div#prompt')
    prompt.querySelectorAll('div.prompt-box[data-prompt-type]').forEach(box => {
        box.classList.remove('active')
    })
    const prompt_box = prompt.querySelector(`div.prompt-box[data-prompt-type="${type}"]`)
    prompt_box.querySelectorAll('input').forEach(input => {
        input.value = ''
    })
    //
    prompt_box.classList.add('active')
    prompt_box.addEventListener('click', e => {
        e.stopPropagation()
    })
    prompt.style.display = 'flex'
    setTimeout(() => {
        prompt.style.opacity = 1
    }, 1)
    //
    const new_folder_submit_button = prompt_box.querySelector('button[data-button="submit"]')
    new_folder_submit_button.addEventListener('click', e => {
        if(type == PrompType.NEW_FOLDER){
            new_folder_submit_button.toggleAttribute('disabled', true)
            callback(prompt_box.querySelector('input').value)
        }
    })
}

const validateNewFolderInput = (input_val) => input_val.length >= 2

const newFolderValidation = () => {
    const input = document.querySelector('#new-folder-input')
    input.addEventListener('input', e => {
        const button = document.querySelector('#submit-new-folder')
        button.toggleAttribute('disabled', !validateNewFolderInput(input.value))
    })
}
newFolderValidation()