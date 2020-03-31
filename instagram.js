const puppeteer = require('puppeteer')
const fs = require('fs')
const moment = require('moment')


const BASE_URL = 'https://www.instagram.com/'
const Profile_URL = (name) => `https://www.instagram.com/${name}`

const TAG_URL = (tag) => `https://www.instagram.com/explore/tags/${tag}/`
const LOCATION_URL = (locationID) => `https://www.instagram.com/explore/locations/${locationID}/`




const instagram = {
    browser: null,
    page: null,
    profilePage: null,
    closeButton: null,
    map : new Map(),


    likePhoto: async (profileName) => {
        
        let isLikeable = await instagram.page.$('button > svg[aria-label="Like"]')
        //let isLikeable2 = await instagram.page.$('//button[aria-label="Like"]')

        if (isLikeable) {
            await instagram.page.click('button > svg[aria-label="Like"]')
            debugger
            //Log
            let time = new Date().getTime()
            fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} liked ${profileName} photo`)
            
        }

        await instagram.page.waitFor(3000)
                    
        //Check if there is a problem
        let problemButton = await instagram.page.$x('//button[contains(text(), "Report a Problem")]')
        if (problemButton.length > 0) {
            //Log
            let time = new Date().getTime()
            fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Error: Too many likes`)

            let okButton = await instagram.page.$x('//button[contains(text(), "OK")]')
            await okButton[0].click()
            return false
        }
        return true
    },

    closePhoto: async () => {
        //close the 
        try {
            //await instagram.page.waitForXPath('//button > svg[aria-label="Close"]')

            const closeButton = await instagram.page.$('button > svg[aria-label="Close"]')
            debugger
            await instagram.page.waitFor(1000)
            await closeButton.click()
            //Log
            time = new Date().getTime()
            fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} clicked close photo button`)

        } catch (err) {
            //Log
            time = new Date().getTime()
            fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Error: with close button ${err}`)
            return
        }

    },

    underXfollowers: (numberOfFollowers, x) => {
        const splitString = numberOfFollowers.split(" ");
        let num = splitString[0]
        const atleastOneAlpha = num.match(/[A-z]/g)
        if (atleastOneAlpha) {
            console.log("too many followers ", num)
            return false
        }
        else {
            num = num.split(',').join('')
            number = parseInt(num)
            if(number > x) {
                console.log("still too many ", number)
                return false
            }
            else {
                console.log("ok perfect ", number)
                return true

            }
        }

    },

    findFollowersText: async (profileName) => {
        let time = new Date().getTime()
        let followersText = null
        let followers = null

        //await instagram.profilePage.waitFor(() => document.querySelector('[placeholder=Search]'))
        try {
            followers = await instagram.profilePage.$x('//a[contains(., " followers")]')
            followersText = await instagram.profilePage.evaluate(followers => followers.textContent, followers[0])
            
        }  catch (err) {
            try {

                //Log
                fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} no link of followers `)

                followers = await instagram.profilePage.$x('//a[contains(., " follower")]')
                followersText = await instagram.profilePage.evaluate(followers => followers.textContent, followers[0])

            } catch (err) {
                //Log
                fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Probably 0 followers `)

                followers = await instagram.profilePage.$x('//span[contains(., " followers")]')
                followersText = await instagram.profilePage.evaluate(followers => followers.textContent, followers[0])
            }

        }
        
        //Log 
        time = new Date().getTime()
        fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} ${profileName} has : ${followersText} `)

        return followersText
    },

    goToProfile: async (profileName) => {
        let time = new Date().getTime()

        try {
            await instagram.profilePage.goto(Profile_URL(profileName), { waituntill: 'networkidle2' })

        } catch (err) {
            //Log
            time = new Date().getTime()
            fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Error with profilePage goto: ${err}`)
            //Close the photo page
            await instagram.closePhoto() 
            throw new Error()
        }              
        //Log
        fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} opened profile link in a new tab: ${profileName}`)

    },

    goToTag: async (tag, flag) => {
        let time = new Date().getTime()
        let nthChild = null

        if (flag === 'tag') {
            await instagram.page.goto(TAG_URL(tag), { waituntill: 'networkidle2' })
            nthChild = 3

            //Log
            time = new Date().getTime()
            fs.appendFileSync('log.txt',`\n --------- ${moment(time).format('MMM:DD-k:mm')} at tag ${tag}`)
        }
        else if (flag === 'location') {
            await instagram.page.goto(LOCATION_URL(tag), { waituntill: 'networkidle2' })
            nthChild = 4
            
            //Log
            time = new Date().getTime()
            fs.appendFileSync('log.txt',`\n --------- ${moment(time).format('MMM:DD-k:mm')} at location ${tag}`)
        }

        return nthChild
    },

    checkForActivity: async () => {
        await instagram.page.waitForXPath('//a[aria-label="Activity Feed]')
        const activityButton = await instagram.page.$x('//a[aria-label="Activity Feed]')
        await instagram.page.waitFor(1000)
        await activityButton[0].click()
        await instagram.page.waitForXPath('_8Mwnh')
        await activityButton[0].click()

    },

    addToFollowingList: (profileName) => {
        fs.appendFileSync('followingHistory.txt',`${profileName}\n`)
        fs.appendFileSync('followingToRemove.txt',`${profileName}\n`)
        instagram.map.set(profileName,true)

    },

    unfollowProcess: async () => {
        let time = new Date().getTime()
        if(!instagram.profilePage) {
            instagram.profilePage = await instagram.browser.newPage()
        }
        try {
            // read contents of the file
            const data = fs.readFileSync('followingToRemove.txt', 'UTF-8');
        
            // split the contents by new line
            const lines = data.split(/\r?\n/);
            
            
            // ufollow all lines
            for (const line of lines) {
                await instagram.goToProfile(line)
                let unfollowingResult = await instagram.unfollowProfile(line)
                if (unfollowingResult === true) {
                    //Log
                    fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} unfollowed ${line}`)
                } else {
                    //Log
                    fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Error: did not managed to unfollow ${line}`)
                }
            }
        } catch (err) {
            //Log
            fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Error: error with reading lines ${err}`)
        }
        fs.writeFileSync('followingToRemove.txt','')
    },

    unfollowProfile: async (profileName) => {
        let time = new Date().getTime()
        
        try {

            await instagram.profilePage.waitFor(1000)
            await instagram.profilePage.waitForXPath('//button[contains(., "Following")]')
            const followingButton = await instagram.profilePage.$x('//button[contains(., "Following")]')
            await instagram.profilePage.waitFor(1000)
            await followingButton[0].click()

            await instagram.profilePage.waitForXPath('//button[contains(., "Unfollow")]')
            const unfollowButton = await instagram.profilePage.$x('//button[contains(., "Unfollow")]')
            await instagram.profilePage.waitFor(1000)
            await unfollowButton[0].click()
            await instagram.profilePage.waitForXPath('//button[contains(., "Follow")]')
            await instagram.profilePage.waitFor(6000)
            //Log
            fs.appendFileSync('unfollowed.txt',`\n${moment(time).format('MMM:DD-k:mm')} unfollowed ${profileName}`)
            
            return true
        
        } catch (err) {
            //Log
            fs.appendFileSync('unfollowed.txt',`\n${moment(time).format('MMM:DD-k:mm')} Error with unfollowing ${profileName} , ${err}`)
            return false
        }
    },

    follow: async (profileName) => {
        let time = new Date().getTime()
        if (instagram.map.get(profileName)) {
            //Log :in following history
            fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} already follows ${profileName}`)
            return false
        }
        try {
            await instagram.page.waitForXPath('//button[contains(., "Follow")]')
            const followButton = await instagram.page.$x('//button[contains(., "Follow")]')
            await instagram.page.waitFor(1000)
            await followButton[0].click()
            await instagram.page.waitForXPath('//button[contains(., "Following")]')
            //Log
            fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} followed ${profileName}`)
            
            return true
        
        } catch (err) {
            //Log
            fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Error: with follow button ${err}`)
            try {
                await instagram.page.waitForXPath('//button[contains(., "Cancel")]')
                const cancelButton = await instagram.page.$x('//button[contains(., "Cancel")]')
                await instagram.page.waitFor(1000)
                await cancelButton[0].click()

            } catch (err) {

            }
            
            return false
        }

    },

    initDataBase: () => {
        let time = new Date().getTime()

        try {
            // read contents of the file
            const data = fs.readFileSync('followingHistory.txt', 'UTF-8');
        
            // split the contents by new line
            const lines = data.split(/\r?\n/);
        
            // map all lines
            lines.forEach((line) => {
                instagram.map.set(line, true)
            });
        } catch (err) {
            //Log
            fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Error: error with reading lines ${err}`)
        }

  
    },

    printMap: () => {
        console.log('Map is:')
        console.log(instagram.map)  
    },

    sleep: (ms) => {
        return new Promise((resolve) => {
            setTimeout(resolve,ms)
        })
    },



    initialize: async () => {

        instagram.browser = await puppeteer.launch({
            headless: false
        })


        instagram.page = await instagram.browser.newPage()

    },

    login: async (username, password) => {
        let time = null
        await instagram.page.goto(BASE_URL, { waituntill: 'networkidle2' })
        let er = false

        //Find Log in button
        try {
            await instagram.page.waitForXPath('//a[contains(text(), "Log in")]', 5000);
            let loginButton = await instagram.page.$x('//a[contains(text(), "Log in")]')
        }
        catch(err) {
            //Log
            fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Error: Cannot find log in link ${err}`)
            er = true
        }
       
        if(er == false) {
            //Click on Log in button
            await loginButton[0].click()
        }
        
        await instagram.page.waitFor(4500)

        //Writing username and password
        await instagram.page.type('input[name="username"]', username, { delay: 50 })
        await instagram.page.type('input[name="password"]', password, { delay: 50 })

        //finding LogIn button
        loginButton = await instagram.page.$x('//button[contains(., "Log In")]')
        
        //Click on Log in button
        await loginButton[0].click()

        await instagram.page.waitFor(10000)
        //await instagram.page.waitFor('a > svg[aria-label="Profile"]')

        //Log
        time = new Date().getTime()
        fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD:k:mm')} Log in as ${username}`)  
        
    },

    likeProcess: async (tags = [], flag) => {
        let nthChild = 0

        for (let tag of tags) {
            //Go to tag page
            if (flag === 'tag') {
                await instagram.page.goto(TAG_URL(tag), { waituntill: 'networkidle2' })
                nthChild = 3
            }
            else if (flag === 'location') {
                await instagram.page.goto(LOCATION_URL(tag), { waituntill: 'networkidle2' })
                nthChild = 4
            }
            await instagram.page.waitFor(1000)

            let posts = await instagram.page.$$(`article > div:nth-child(${nthChild}) img[decoding="auto"]`)
            for (let i = 0; i < 6; ++i ) {

                let post = posts[i]

                //Click on the post
                await post.click()

                //Wait for the photo to appear
                await instagram.page.waitFor('body[style="overflow: hidden;"]')
                await instagram.page.waitFor(1000)

                //Like the photo
                let isLikeable = await instagram.page.$('span[aria-label="Like"]')
                if(isLikeable) {
                    await instagram.page.click('span[aria-label="Like"]')
                }

                await instagram.page.waitFor(3000)
                
                //Check if there is a problem
                let problemButton = await instagram.page.$x('//button[contains(text(), "Report a Problem")]')
                if (problemButton.length > 0) {
                    let time = new Date().getTime()
                    fs.appendFileSync('log.txt',`${instagram.timeConverter(time)} Too many likes`)
                    return
                }

                //close the photo
                let closeButton = await instagram.page.$x('//button[contains(., "Close")]')
                await closeButton[0].click()
                await instagram.page.waitFor(1000)

            }
            
            await instagram.page.waitFor(7200000)
        }
    },
    
    followProcess: async (tags = [], flag) => {
        let time = new Date().getTime()
        let likes = 0
        let follows = 0

        for (let tag of tags) {
            //Open profilePage
            instagram.profilePage = await instagram.browser.newPage()
            await instagram.page.bringToFront()  

            //Go to tag page
            let nthChild = await instagram.goToTag(tag, flag)
            
            await instagram.page.waitFor(8000)
            await instagram.page.waitFor(() => document.querySelector('[placeholder=Search]'))

            let posts = await instagram.page.$$(`article > div:nth-child(${nthChild}) img[decoding="auto"]`)
            for (let i = 0; i < 12; ++i ) {
                //Log
                time = new Date().getTime()
                fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD:k:mm')} photo number ${i+1}`)   
                await instagram.page.waitFor(2000)

                let post = posts[i]

                //Click on the post
                await post.click()

                //Wait for the photo to appear
                await instagram.page.waitFor('body[style="overflow: hidden;"]')
                await instagram.page.waitFor(3000)
                
                //Get user name
                let profileLink = await instagram.page.$('a[class = "sqdOP yWX7d     _8A5w5   ZIAjV "]')
                
                if(!profileLink) {
                    //Log
                    time = new Date().getTime()
                    fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Error: error with profile link `)
                    
                    //Error close the photo
                    await instagram.closePhoto()
        
                    await instagram.page.waitFor(1000)
                    continue
                }
                const profileName = await instagram.page.evaluate(profileLink => profileLink.textContent, profileLink)
                console.log(profileName)

                //Open a new tab for user profile
                try {
                    await instagram.goToProfile(profileName)
                } catch (err) {
                    try {
                        await instagram.profilePage.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
                        
                    } catch (err) {
                        await instagram.profilePage.close()
                        instagram.page = await instagram.browser.newPage() 
                        await instagram.page.bringToFront()  
                    }
                    continue
                }              

                await instagram.page.waitFor(7000)

                //find out the followers text
                let followersText = await instagram.findFollowersText(profileName)

                if(instagram.underXfollowers(followersText, 500)) {
                    //Like the photo
                    const liked = await instagram.likePhoto(profileName)
                    if (liked === false) { 

                        //Close profilePage    
                        instagram.profilePage.close()

                        //Log
                        time = new Date().getTime()
                        fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} likes so far: ${likes} follows so far: ${follows}`)
                        fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Going to sleep for ${9900000/60000} minutes`)
                        instagram.page.close()
                        instagram.browser.close()
                        await instagram.sleep(9900000)
                        await instagram.initialize()
                        await instagram.login('', '')
                        return

                    }
                    ++likes

                    //follow the user
                    const followed = await instagram.follow(profileName)
                    if (followed === true) { 
                        ++follows
                        instagram.addToFollowingList(profileName)
                    }
                    //Check if there is a problem
                    let problemButton = await instagram.page.$x('//button[contains(text(), "Report a Problem")]')
                    if (problemButton.length > 0) {
                        //Log
                        let time = new Date().getTime()
                        fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Error: Too many follows`)

                        let okButton = await instagram.page.$x('//button[contains(text(), "OK")]')
                        await okButton[0].click()
                        fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} likes so far: ${likes} follows so far: ${follows}`)
                        fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Going to sleep for ${9900000/60000} minutes`)
                        instagram.profilePage.close()
                        instagram.page.close()
                        instagram.browser.close()
                        await instagram.sleep(9900000)
                        await instagram.initialize()
                        await instagram.login('', '')
                        return
                    }
                }

                await instagram.page.waitFor(3000)

                //Close the photo page
                await instagram.closePhoto() 

                await instagram.page.waitFor(2000)

            }
        //Close profilePage    
        instagram.profilePage.close()

        const sleepTime = 9900000    
        //Log
        time = new Date().getTime()
        fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} likes so far: ${likes} follows so far: ${follows}`)
        fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Going to sleep for ${sleepTime/60000} minutes`)
        await instagram.sleep(sleepTime)
        //await instagram.page.waitFor(sleepTime)
        
        }

        time = new Date().getTime()
        fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} likes so far: ${likes} follows so far: ${follows}`)

    }

}

module.exports = instagram


                //Get user profile link 
                //let profileLink = await instagram.page.$$('div[role="button"]')
                //let profileURL = profileLink[2]

                //Get all pages
                // try {
                //     pageList = await instagram.browser.pages()

                // } catch (err) {
                //      //Log
                //      time = new Date().getTime()
                //      fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} Error: error browser.pages ${err}`)
                     
                //      //Error close the photo
                //      await instagram.closePhoto()
                    
                //      await instagram.page.waitFor(1000)
                //      continue
                // }
                // for (const page of pageList) {
                //     console.log(page.url())  
                // }
                 //Log
                //time = new Date().getTime()
                //fs.appendFileSync('log.txt',`\n${moment(time).format('MMM:DD-k:mm')} we have : ${pageList.length} pages`)
