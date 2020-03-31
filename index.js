const ig = require('./instagram')

const password = 'put your password here'
const user = 'put your user here'

//Locations:
//Tel Aviv
const telAvivL = 213041503
//Ramat Gan
const ramatGanL = 223431395
//Israel
const israelL = 264915885
//Salar de Uyuni Bolivia
const salarL = 629396338

const start = async () => {
    await ig.initialize()
    await ig.login(user,password)
    ig.initDataBase()

    for (let i = 0; i < 2; ++i ) {
        //ig.printMap()
        await ig.followProcess([telAvivL, salarL, ramatGanL], 'location')
        //await ig.likeProcess([telAvivL, ramatGanL], 'location')
        //await ig.unfollowProcess()
    }

    debugger
    return
}

start()
return