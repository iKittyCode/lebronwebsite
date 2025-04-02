const express = require("express")
const app = express()
const session = require('express-session');
const path = require("path")
const fetch = require("fetch")
const nba = require("nba-api-client");
const recgame = require("./search.js")

const {
    error
} = require("console");
const {
    APIError
} = require("@balldontlie/sdk");
const nbasecondary = require("nba")


const lebronid = nba.getPlayerID("LeBron James")['PlayerID']
const lebronteamid = nba.getPlayerID("LeBron James")['TeamID']
console.log(lebronid, lebronteamid)
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))
app.use(session({
    secret: 'supersecretkey',
    resave: false,
    saveUninitialized: true
}));
// async function getlebronseasonaverages(year) {
//     // var st = await nba.playerCareerStats({PlayerID:lebronid, Season: "2024-2025", MeasureType: "Scoring"})


// }
// getlebronseasonaverages().then(function(data){
//     console.log(data)
// }) 

async function getlakerscurrentroster() {
    var roster = await nba.teamRoster({
        TeamID: lebronteamid,
        Season: "2024"
    })
    return roster;

}

async function getlebroncurrentseasonaverages() {
    const player = nbasecondary.findPlayer("LeBron James");
    if (!player) {
        console.log('Player not found.');
        return;
    }


    try {
        const stats = await nbasecondary.stats.playerInfo({
            PlayerID: player.playerId
        });
        const seasonAverages = stats.playerHeadlineStats[0];

        console.log(`Season Averages for ${player.fullName}:`);
        console.log(`Points: ${seasonAverages.pts}`);
        console.log(`Assists: ${seasonAverages.ast}`);
        console.log(`Rebounds: ${seasonAverages.reb}`);
        return `Points: ${seasonAverages.pts} Assists: ${seasonAverages.ast} Rebounds: ${seasonAverages.reb}`

    } catch (error) {
        console.error('Error fetching player statistics:', error);
    }
}

// async function getlebronrecentgames () {
   
//     // nba.schedule().then((data)=>{

//     // })

// };
//  getlebronrecentgames()
function getlebronlastgamestatisticsnormal() {
    nba.teamPlayerStats({TeamID:lebronteamid, Season:"2024-25", LastNGames:"1"}).then(data => {

})
}
getlebronlastgamestatisticsnormal()
app.use(express.static("public"))
app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));
app.get("/", (req, res) => {
    var rp;
    var roster;
    recgame.getRecentLakersGame().then(sk =>{
     
   
    rp = getlakerscurrentroster().then(function (data) {
        
        roster = data;
        var current;
        var teamheadshots = []
        var sas = getlebroncurrentseasonaverages().then(function (data) {
            // console.log(data)
            // console.log(roster)

            for (i in roster["CommonTeamRoster"]) {

               
                    let oldheadshot = nba.getPlayerHeadshotURL({
                        PlayerID: roster["CommonTeamRoster"][i]["PLAYER_ID"],
                        TeamID: lebronteamid
                    })
                    let headshot = oldheadshot.replace('2019', '2024')
                    teamheadshots.push(headshot)
                
            }
            // console.log(teamheadshots)


            var lebroncurrentseasonaverages = data;
            current = {
                image: nba.getPlayerHeadshotURL({
                    PlayerID: lebronid,
                    TeamID: lebronteamid
                }),
                currentaverage: lebroncurrentseasonaverages,
                roster: roster,
                teamheadshots: teamheadshots,
                lastmatchup:sk

                

            }

            try {
                res.render("homepage", {current })
            } catch {
                console.log(error)
            }
        })
    })
})

})
app.listen(3000, () => {
    console.log("Server on http://localhost:3000")

})