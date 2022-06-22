const app = require('express')();
const axios = require('axios').default; // http request
const fs = require('fs');


/**
 * PRODUCCIÓN
 */
const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/chesscolate.json.com.co/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/chesscolate.json.com.co/cert.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/chesscolate.json.com.co/chain.pem')
};


const http = require('https').createServer(options, app);

const admin = require('firebase-admin');
/**
 * PRODUCCIÓN
 */
const serviceAccount = require("./private/chesscolate-firebase-adminsdk-z54d6-ffdbf8e69f.json");



admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: ""
});


const db = admin.firestore();



// var io = require('socket.io')(http);

const io = require('socket.io')(http, {
    cors: {
        origin: '*',
    },
    pingInterval: 2000
});

app.get('/', (req, res) => res.send('buuuu!'));

/**
 * bote donde están las solicitudes de juego para emparejar 
 */
const gBoat = [];

/**
 * Permite saber si ya se esta escuchando la collection del bote en firestore
 */
let gReadyListenBoat = false;

// juegos en curso
/**
 * Listado de juegos emitidos al realizar match
 */
const gGames = [];
/**
 * Permite saber si ya se esta escuchando la collection de los juegos en firestore
 */
let gReadyListenGames = false;

/**
 * Almacena los relojes
 *  
    - uidGame: string;
    - intervalClockWhiteCountDown: any;
    - intervalClockBlackCountDown: any;
    - intervalClockWhite: any;
    - intervalClockBlack: any;
    - createAt: number;
 */
const gGamesClocks = [];

/**
 * El numero de segundos antes de que se cancele el juego si las blancas no mueven (milisegundos)
 */
const gTimerContDown = 20000;

io.on('connection', (socket) => {


    // Estructura 
    // id
    // in = recibe data
    // Out = emite data
    // in_categoryName_name
    // out_categoryName_name

    /* 
        game
    */

    // 1 Cuando un usuario solicita emparejarse para jugar
    /** 
     * - uidUser: string
     * - time: number // tiempo para el juego ejm: 10 minutes
     * - lang: string 2 character
     * - elo: number
     * - color: white / black / random
     * - country: string 3 characters
     * - createAt: number (auto generado al ingresar al bote) / fecha para dar prioridad si lleva mucho tiempo esperando
     */
    socket.on('1_in_matchEngine_requestGame', (userRequestToPlay) => {
        userRequestToPlay.time = Number(userRequestToPlay.time);
        userRequestToPlay.elo = Number(userRequestToPlay.elo);
        console.log('llega ------------- ', userRequestToPlay);

        ejectGameMatch(userRequestToPlay).then((game) => {
            gGames.push(game);
            io.emit('2_out_matchEngine_readyMatch', game);

            // se inicia el countdown para el blanco
            let clockIndex = gGamesClocks.findIndex(item => item.uidGame === game.uid);
            if (clockIndex >= 0) {
                let timerContDown = gTimerContDown;
                const idIntervalCountDown = setInterval(() => {
                    timerContDown = timerContDown - 1000;

                    if (timerContDown === 0) {

                        deleteGameClock(gGamesClocks[clockIndex]);
                        const newEndGame = {
                            uid: clock.uidGame,
                            result: '*',
                            motive: 'whiteCountdown'
                        };

                        emitEndGame(newEndGame);

                        // TODO: Guardar el log del fin del juego en firestore

                    }

                    io.emit('5_out_clock_update', {
                        uid: clock.uidGame, // con esto se escucha en los clientes (uid del juego)
                        time: timerContDown,
                        type: 'whiteCountDown'
                    });


                }, 1000);


                gGamesClocks[clockIndex].intervalClockWhiteCountDown = idIntervalCountDown;

            }
        }).catch(() => { });

    });

    // 3 cuando un usuario envía una jugada
    /**
     * - uid: string;
     * - uidGame: string;
     * - uidUser: string;
     * - from: number;
     * - to: number;
     * - fen: string;
     * - color: string;
     * - piece: string;
     * - sean: string;
     * - createAt: number;
     */
    socket.on('3_in_game_move', (move) => {
        // TODO: validar jugada

        // - detiene el countdown para las blancas en caso de existir
        // - 
        checkClock(move);

        saveMove(move).then((moveSaved) => {
            io.emit('4_out_game_move', moveSaved);
        });
    });


});

http.listen(3000, () => {
    console.log('listening on *:3000');
});

/**
 * Emisores
 */

// ----------------------------------------------------------------------------
// 6_out_game_end

// - uid: string;
// - result: string; // '1-0' | '0-1' | '1/5 1/5' | '*'
// - motive: string; // 'blackCountdown' | 'whiteCountdown' | 'blackOut' | 'whiteOut' | 'whiteResign' | 'blackResign' | '#' | 'whiteTimeOut' | 'blackTimeOut'
function emitEndGame(newEndGame) {
    io.emit('6_out_game_end', newEndGame);
    // TODO: Guardar el log del fin del juego en firestore
}

// ----------------------------------------------------------------------------
// 5_out_clock_update
// - uidGame: string; // con esto se escucha en los clientes (uid del juego)
// - intervalClockWhiteCountDown?: any;
// - intervalClockBlackCountDown?: any;
// - intervalClockWhite?: any;
// - intervalClockBlack>: any;
// - createAt: number; // para firestore
function emitUpdateClock(clockUpdate) {
    io.emit('5_out_clock_update', clockUpdate);
}

/**
 * Functions
 */

// ----------------------------------------------------------------------------
// Match Engine

// Retorna una promesa que se resuelva si se hace el match y retorna el objeto del juego
//  o error si no tiene usuario para emparejar
function ejectGameMatch(userRequestToPlay) {

    return new Promise((resolve, reject) => {

        if (gBoat.length > 0) {


            // por tiempo
            let filtered = gBoat.filter(item => item.time === userRequestToPlay.time);

            // filtrar por color solo si el usuario selecciono un color
            if (userRequestToPlay.color !== 'random') {
                // por color
                filtered = filtered.filter(item => item.color !== userRequestToPlay.color);
            }

            // por elo
            // TODO: validar con un if si tiene elo
            filtered = filtered.filter(item => (item.elo <= userRequestToPlay.elo + 100 && item.elo >= userRequestToPlay.elo - 100));
            // por idioma (no prioritario)
            // TODO: validar con un if si tiene el idioma
            const filteredLang = filtered.filter(item => item.lang === userRequestToPlay.lang);
            filtered = filteredLang.length > 0 ? filteredLang : filtered;
            // por país (no prioritario)
            // TODO: validar con un if si tiene el país
            const filteredCountry = filtered.filter(item => item.country === userRequestToPlay.country);
            filtered = filteredCountry.length > 0 ? filteredCountry : filtered;
            let match;

            if (filtered.length > 1) { // Si aun se tienen muchos prospectors, se elije uno al azar
                match = filtered[Math.floor(Math.random() * filtered.length)];
            } else if (filtered.length === 1) {
                match = filtered[0]; // si solo tiene uno, se toma
            }

            if (match) {
                // Aquí se debe organizar los colores
                generateNewGame(match, userRequestToPlay).then((game) => {
                    // Se elimina con quien se hizo match del bote
                    deleteItemBoat(match);
                    // finalmente se genera el nuevo juego que se emitirá
                    resolve(game); // único resolve
                });
            } else {
                // No tiene nadie con quien hacer match, se incorpora al bote,
                // y queda a la espera de que llegue un competidor
                addToBoat(userRequestToPlay);
                reject(false);
            }


        } else if (gBoat.length === 0 && gReadyListenBoat) { // si el bote esta vació, y ya se consulto a firestore, simplemente se adiciona la solicitud al bote
            addToBoat(userRequestToPlay);
            reject(false);
        } else {
            // escucha el bote de respaldo (es un inicio o un reinicio del server)
            listenFirestoreBoat();
            addToBoat(userRequestToPlay);
            reject(false);
        }
    });

}

// ----------------------------------------------------------------------------
// Boat
function addToBoat(userRequestToPlay) {
    const toAddBoat = {
        ...userRequestToPlay,
        createAt: new Date().getTime()
    };
    gBoat.push(toAddBoat);
}

// se elimina un item del bote
function deleteItemBoat(match) {
    const toDelete = gBoat.findIndex(item => item.createAt === match.createAt);
    gBoat.splice(toDelete, 1);
}




// ----------------------------------------------------------------------------
// Game

// retorna una promesa que retorna el objeto de un nuevo juego entre dos jugadores
function generateNewGame(player1, player2) {
    return new Promise((resolve, reject) => {
        // Se organizan los colores
        if (player1.color === 'random' && player2.color === 'random') {
            const randomColor = getRandomColor();
            player1.color = randomColor;
            player2.color = randomColor === 'white' ? 'black' : 'white';
        } else if (player1.color !== 'random') {
            player2.color = player1.color === 'white' ? 'black' : 'white';
        } else if (player2.color !== 'random') {
            player1.color = player2.color === 'white' ? 'black' : 'white';
        }

        const uid = createUid();

        // crea el reloj para el juego
        createGameClock(uid, player1.time, player1.timeIncrement);

        // TODO: crear instancia del juego

        // : Game https://github.com/json-alzate/ChessColate_server_sockets#game
        const newGame = {
            uid,
            white: player1.color === 'white' ? player1 : player2,
            black: player2.color === 'black' ? player2 : player1,
            uidUserWhite: player1.color === 'white' ? player1.uidUser : player2.uidUser,
            uidUserBlack: player1.color === 'black' ? player1.uidUser : player2.uidUser,
            timeControl: player1.time,
            createAt: new Date().getTime()
        };

        resolve(newGame);

    });
}



// TODO: debe retornar una promesa que se resuelva si se guarda la jugada 
//  o error si la jugada es ilegal
function saveMove(move) {
    return new Promise((resolve, reject) => {
        console.log('guardar jugada!!!');
        // TODO: logica para validar y guardar la jugada
        resolve(move);
    });
}

// ----------------------------------------------------------------------------
// Clocks

// - type: 'white' | 'black' | 'whiteCountdown';
/**
 * Prepara un espacio para un reloj, y asi tener la referencia para iniciarlo o detenerlo
 */
function createGameClock(uidGame, totalTime, timeIncrement) {

    const newClock = {
        uidGame,
        intervalClockWhiteCountDown: null,
        intervalClockBlackCountDown: null,
        intervalClockWhite: null,
        intervalClockBlack: null,
        totalTime,
        timeIncrement,
        createAt: new Date().getTime()
    };

    gGamesClocks.push(newClock);

}


/**
 * Adiciona un reloj al array de relojes
 * @param {*} clock 
 */
function addClock(clock) {
    gGamesClocks.push(clock);
}

/**
 * Elimina un reloj del arreglo de relojes
 */
function deleteGameClock(clock) {
    const toDelete = gGamesClocks.findIndex(item => item.uid === clock.uid);
    if (toDelete > -1) {

        if (gGamesClocks[toDelete].intervalClockWhiteCountDown) {
            clearInterval(gGamesClocks[toDelete].intervalClockWhiteCountDown);
        }

        if (gGamesClocks[toDelete].intervalClockBlackCountDown) {
            clearInterval(gGamesClocks[toDelete].intervalClockBlackCountDown);
        }

        gGamesClocks.splice(toDelete, 1);
    }

}


function pauseClock(idInterval) {
    clearInterval(idInterval);
}

/**
 * Remplaza un reloj por otro en el arreglo de relojes
 * @param {*} clock 
 */
function updateClock(clock) {
    // TODO: logica para actualizar el reloj
    // de esta manera puede ocasionar bugs?
    deleteGameClock(clock);
    addClock(clock);
}

/**
 * - Valida si el blanco tiene un countdown activo y lo detiene, y crea uno nuevo para el negro. => return
 * - Si el negro tiene un countDown activo, lo detiene y crea un reloj para el blanco y lo inicia
 * - Si el blanco tiene un countDown activo, lo detiene y crea un reloj para el juego como tal iniciando el contador para el blanco
 * @param {*} move 
 */
function checkClock(move) {


    if (move.color === 'w') {

        // Validar si el blanco tiene countDown activo
        const indexHaveCountDown = gGamesClocks.findIndex(item => item.uidGame === move.uidGame && item.intervalClockWhiteCountDown);
        // si tiene countDown, se detiene y se crea uno para las negras
        if (indexHaveCountDown >= 0) {
            clearInterval(gGamesClocks[indexHaveCountDown].intervalClockWhiteCountDown);
            const clock = gGamesClocks[indexHaveCountDown];

            let timerContDown = gTimerContDown;
            gGamesClocks[indexHaveCountDown].intervalClockBlackCountDown = setInterval(() => {
                timerContDown = timerContDown - 1000;

                if (timerContDown <= 0) {
                    deleteGameClock(gGamesClocks[indexHaveCountDown]);
                    const newEndGame = {
                        uid: clock.uidGame,
                        result: '*',
                        motive: 'blackCountdown'
                    };

                    emitEndGame(newEndGame);

                }

                emitUpdateClock({
                    uid: clock.uidGame, // con esto se escucha en los clientes (uid del juego)
                    time: timerContDown,
                    type: 'blackCountDown'
                });

            }, 1000);

        } else {
            // Si no tiene countDow debe ser un juego iniciado, entonces se busca el reloj  para detenerlo el del blanco y activar el del negro
            // Si el negro no tiene uno se crea y se activa
            // TODO: 
        }
    } else if (move.color === 'b') {

        // Validar si el negro tiene countDown activo
        const indexHaveCountDown = gGamesClocks.findIndex(item => item.uidGame === move.uidGame && item.intervalClockBlackCountDown);
        // si tiene countDow se detiene, y se crea y activa el reloj para el blanco
        if (indexHaveCountDown >= 0) {

            const clock = gGamesClocks[indexHaveCountDown];

            clearInterval(clock.intervalClockBlackCountDown);
            let timerContDown = clock.totalTime;

            gGamesClocks[indexHaveCountDown].intervalClockWhite = setInterval(() => {
                timerContDown = timerContDown - 1000;

                if (timerContDown <= 0) {
                    deleteGameClock(clock);
                    const newEndGame = {
                        uid: clock.uidGame,
                        result: '0-1',
                        motive: 'whiteTimeOut'
                    };

                    emitEndGame(newEndGame);
                }

                emitUpdateClock({
                    uid: clock.uidGame, // con esto se escucha en los clientes (uid del juego)
                    time: timerContDown,
                    type: 'white' // Se indica que es el reloj del blanco el que esta corriendo
                });


            }, 1000);
        } else {
            // Si no tiene countDow debe ser un juego iniciado, entonces se busca el reloj para detenerlo el del negro y activar el del blanco
            // Si el negro no tiene uno se crea y se activa
            // TODO: 
        }

    }


}


// ----------------------------------------------------------------------------
// Utils

// Genera un string con el valor 'white' o 'black'
function getRandomColor() {
    return Math.random() < 0.5 ? 'white' : 'black';
}

/**
 * Genera un uid aleatorio
 */
function createUid() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}


/*
    * Firestore
*/

// TODO escuchar un bote de respaldo en firestore
// se hace por si se reinicia el servidor no se pierda el estado del bote
function listenFirestoreBoat() {
    gReadyListenBoat = true;
    // TODO: escuchar bote desde firestore y activar gReadyListenBoat
}