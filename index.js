var app = require('express')();
const axios = require('axios').default;
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
const serviceAccount = require("./");



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


io.on('connection', (socket) => {
    
    socket.on('socket-name', (receive) => {

        io.emit('socket-emit', receive);

    });


});

http.listen(3000, () => {
    console.log('listening on *:3000');
});


/*
    * Firestore
*/
