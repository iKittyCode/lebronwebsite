const axios = require('axios');

async function getRecentLakersGame() {
    try {
        // Try NBA's official API first
        const response = await axios.get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json');
        const allGames = response.data.scoreboard.games;
        
        // Find Lakers games (Team ID 1610612747)
        const lakersGames = allGames.filter(game => 
            game.homeTeam.teamId === 1610612747 || 
            game.awayTeam.teamId === 1610612747
        );

        if (lakersGames.length > 0) {
            lakersGames.sort((a, b) => new Date(b.gameTimeUTC) - new Date(a.gameTimeUTC));
            return formatGameData(lakersGames[0]);
        }

        // If no Lakers games today, check previous days
        console.log('No Lakers games today. Checking recent schedule...');
        const scheduleData = await checkRecentSchedule();
        if (scheduleData) return scheduleData;

    } catch (error) {
        console.error('Error with primary API:', error.message);
        console.log('Trying ESPN API...');
        const espnData = await tryESPNApi();
        if (espnData) return espnData;
    }

    return { error: "Could not retrieve Lakers game data" };
}

async function checkRecentSchedule() {
    try {
        const response = await axios.get('https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json');
        const allGames = response.data.leagueSchedule.gameDates.flatMap(date => date.games);
        const lakersGames = allGames.filter(game => 
            game.homeTeam.teamId === 1610612747 || 
            game.awayTeam.teamId === 1610612747
        );

        if (lakersGames.length === 0) return null;

        lakersGames.sort((a, b) => new Date(b.gameDateTimeUTC) - new Date(a.gameDateTimeUTC));
        const recentGame = lakersGames.find(game => game.gameStatus >= 2) || lakersGames[0];
        return formatGameData(recentGame);

    } catch (error) {
        console.error('Error checking schedule:', error.message);
        return null;
    }
}

async function tryESPNApi() {
    try {
        const response = await axios.get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/los-angeles-lakers/schedule');
        const events = response.data.events;
        
        if (!events || events.length === 0) return null;

        const recentGame = events.find(event => 
            event.status.type.state !== 'pre'
        ) || events[0];

        return formatESPNGameData(recentGame);

    } catch (error) {
        console.error('Error with ESPN API:', error.message);
        return null;
    }
}

function formatGameData(game) {
    const gameTime = new Date(game.gameTimeUTC || game.gameDateTimeUTC);
    const isHome = game.homeTeam.teamId === 1610612747;
    
    return {
        team: "Los Angeles Lakers",
        date: gameTime.toISOString(),
        localDate: gameTime.toLocaleString(),
        matchup: {
            vs: isHome ? game.awayTeam.teamName : game.homeTeam.teamName,
            location: isHome ? 'home' : 'away',
            opponent: isHome ? game.awayTeam.teamName : game.homeTeam.teamName,
            opponentAbbreviation: isHome ? game.awayTeam.teamTricode : game.homeTeam.teamTricode
        },
        score: game.gameStatus === 3 ? {
            lakers: isHome ? game.homeTeam.score : game.awayTeam.score,
            opponent: isHome ? game.awayTeam.score : game.homeTeam.score,
            result: game.homeTeam.score > game.awayTeam.score ? 
                (isHome ? 'win' : 'loss') : 
                (isHome ? 'loss' : 'win')
        } : null,
        gameStatus: getGameStatus(game.gameStatus),
        ...(game.gameStatus === 2 && { // In-progress game details
            live: {
                lakersScore: isHome ? game.homeTeam.score : game.awayTeam.score,
                opponentScore: isHome ? game.awayTeam.score : game.homeTeam.score,
                quarter: game.period,
                clock: game.gameClock
            }
        }),
        arena: {
            name: game.arenaName,
            city: game.arenaCity
        },
        tvBroadcast: game.tvBroadcaster,
        source: "NBA Official API"
    };
}

function formatESPNGameData(event) {
    const homeTeam = event.competitions[0].competitors.find(t => t.homeAway === 'home');
    const awayTeam = event.competitions[0].competitors.find(t => t.homeAway === 'away');
    const isLakersHome = homeTeam.team.abbreviation === 'LAL';
    const lakers = isLakersHome ? homeTeam : awayTeam;
    const opponent = isLakersHome ? awayTeam : homeTeam;
    const gameTime = new Date(event.date);

    return {
        team: "Los Angeles Lakers",
        date: event.date,
        localDate: gameTime.toLocaleString(),
        matchup: {
            vs: opponent.team.name,
            location: isLakersHome ? 'home' : 'away',
            opponent: opponent.team.name,
            opponentAbbreviation: opponent.team.abbreviation
        },
        score: event.status.type.state === 'post' ? {
            lakers: lakers.score,
            opponent: opponent.score,
            result: lakers.winner ? 'win' : 'loss'
        } : null,
        gameStatus: getESPNGameStatus(event.status.type.state),
        ...(event.status.type.state === 'in' && { // In-progress game details
            live: {
                lakersScore: lakers.score,
                opponentScore: opponent.score,
                quarter: event.status.period,
                clock: event.status.displayClock
            }
        }),
        arena: {
            name: event.competitions[0].venue.fullName,
            city: event.competitions[0].venue.address.city
        },
        tvBroadcast: event.competitions[0].broadcasts?.[0]?.names?.[0],
        source: "ESPN API"
    };
}

function getGameStatus(statusCode) {
    const statusMap = {
        1: 'scheduled',
        2: 'in_progress',
        3: 'final',
        4: 'postponed',
        5: 'cancelled'
    };
    return statusMap[statusCode] || 'unknown';
}

function getESPNGameStatus(status) {
    const statusMap = {
        'pre': 'scheduled',
        'in': 'in_progress',
        'post': 'final'
    };
    return statusMap[status] || 'unknown';
}

// Example usage:

getRecentLakersGame().then(gameData => {
    console.log(gameData);
    // You can now use the gameData object in your application
});
module.exports = {
    getRecentLakersGame
}