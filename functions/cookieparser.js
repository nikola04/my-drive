module.exports = (cookie_string) => {
    if(cookie_string == undefined) return []
    const formated = []
    const cookies = cookie_string.split(';');
    cookies.forEach(cookie => {
        const [name, ...rest] = cookie.split('=') 
        const value = rest.join('=').trim()
        formated.push({ name, value })
    });
    return formated;
}