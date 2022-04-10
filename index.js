var app = require('express')();
const axios = require('axios').default; // http request
var fs = require('fs');

/**
 * PRODUCCIÓN
 */
var options = {
    key: fs.readFileSync('/etc/letsencrypt/live/chesscolate.json.com.co/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/chesscolate.json.com.co/cert.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/chesscolate.json.com.co/chain.pem')
};


var http = require('https').createServer(options, app);

var admin = require('firebase-admin');
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
    }
});

app.get('/', (req, res) => res.send('buuuu!'));

// bote donde están las solicitudes de juego para emparejar   
const gBoat = [];
// para saber si ya se esta escuchando la collection del bote en firestore
let gReadyListenBoat = false;

// juegos en curso
const gGames = [];
let gReadyListenGames = false;

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
    socket.on('1_in_game_requestGame', (data1Receive) => {
        ejectGameMatch(data1Receive).then((gameReady) => {
            gGames.push(gameReady);
            io.emit('2_out_game_match', gameReady);
        });
    });

    // 3 cuando un usuario envia una jugada
    /**
     * - uidUser
     * - move
     * - uidGame
     */
    socket.on('3_in_game_move', (data3Receive) => {
        saveMove(data3Receive).then((moveSaved) => {
            io.emit('4_out_game_ejectMove', moveSaved);
        });
    });


});

http.listen(3000, () => {
    console.log('listening on *:3000');
});

/**
 * Functions
 */

// TODO: debe retornar una promesa que se resuelva si se hace el match y retorna el objeto del juego
//  o error si no tiene usuario para emparejar
function ejectGameMatch(data1Receive) {

    return new Promise((resolve, reject) => {

        if (gBoat.length > 0) {
            // por tiempo
            let filtered = gBoat.filter(item => item.time === data1Receive.time);
            const color = data1Receive.color === 'random' ? getRandomColor() : data1Receive.color;
            // por color
            filtered = filtered.filter(item => item.color !== color);
            // por elo
            filtered = filtered.filter(item => (item.elo <= data1Receive.elo + 100 && item.elo >= data1Receive.elo - 100));
            // por idioma (no prioritario)
            const filteredLang = filtered.filter(item => item.lang === data1Receive.lang);
            filtered = filteredLang.length > 0 ? filteredLang : filtered;
            // por pais (no prioritario)
            const filteredCountry = filtered.filter(item => item.country === data1Receive.country);
            filtered = filteredCountry.length > 0 ? filteredCountry : filtered;

            let match;

            if (filtered.length > 1) { // Si aun se tienen muchos prospectos, se elije uno al azar
                match = filtered[Math.floor(Math.random() * filtered.length)];
            } else if (filtered.length === 1) {
                match = filtered[0]; // si solo tiene uno, se toma
            }

            if (match) {
                generateNewGame(match, data1Receive).the((game) => {
                    // Se elimina con quien se hizo match del bote
                    deleteItemBoat(match);
                    // finalmente se genera el nuevo juego que se emitira
                    resolve(game);
                });
            } else {
                // No tiene nadie con quien hacer match, se incorpora al bote,
                // y queda a la espera de que llegue un competidor
                gBoat.push(data1Receive);
                reject();
            }


        } else if (gBoat.length === 0 && gReadyListenBoat) { // si el bote esta vacio, y ya se consulto a firestore, simplemente se adiciona la solicitud al bote
            const toAddBoat = {
                ...data1Receive,
                createAt: new Date().getTime()
            };
            gBoat.push(data1Receive);
            reject();
        } else {
            // escucha el bote de respaldo (es un inicio o un reinicio del serve)
            listenFirestoreBoat();
        }
    });

}

// Genera un string con el valor 'white' o 'black'
// TODO generar random
function getRandomColor() {

}

// TODO retorna una promesa que retorna el objeto de un nuevo juego entre dos jugadores
function generateNewGame(player1, player2) {
    return new Promise((resolve, reject) => {

    });
}

// se elimina un item del bote
function deleteItemBoat(match) {
    const toDelete = gBoat.findIndex(item => item.createAt === match.createAt);
    gBoat.splice(toDelete, 1);
}

// TODO: debe retornar una promesa que se resuelva si se guarda la jugada 
//  o error si la jugada es ilegal
function saveMove(data3Receive) {

}


/*
    * Firestore
*/

// TODO escuchar un bote de respaldo en firestore
// se hace por si se reinicia el servidor no se pierda el estado del bote
function listenFirestoreBoat() {
    // TODO: escuchar bote desde firestore y activar gReadyListenBoat
}