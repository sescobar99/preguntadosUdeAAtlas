const MongoClient = require('mongodb').MongoClient;
var db_methods = require('./db_methods');

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);  //servidor de websockets

var PUERTO = 3000;
server.listen(process.env.PORT || PUERTO, function () {
    console.log('Servidor corriendo en http://localhost:' + PUERTO);
}); //process.env.PORT ||

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

var SOCKET_LIST = {};
var TIEMPO_PREGUNTAS = 8000;
var TIEMPO_RESTANTE = TIEMPO_PREGUNTAS;
var PREGUNTA_ACTUAL = null;
var ACTUAL_RANK = [];

(async function () {

    const uri = "mongodb+srv://root:root@cluster0-dabj0.mongodb.net/test?retryWrites=true&w=majority";

    const client = new MongoClient(uri, { useUnifiedTopology: true });

    try {
        await client.connect();

        io.sockets.on('connection', async function (socket) {
            console.log('Pendiente por ingresar credenciales: ' + socket.id);

            socket.on('signIn', async function (data) {

                isValid = await db_methods.isValidPassword(client, data.username, data.password);

                if (isValid) {

                    socket.emit('signInResponse', { success: true });

                    socket.id = isValid.username;
                    console.log('Ingreso: ' + socket.id);
                    SOCKET_LIST[socket.id] = socket;

                    socket.emit('pregunta', {
                        enunciado: PREGUNTA_ACTUAL[0].question,
                        a: PREGUNTA_ACTUAL[0].a,
                        b: PREGUNTA_ACTUAL[0].b,
                        c: PREGUNTA_ACTUAL[0].c,
                        d: PREGUNTA_ACTUAL[0].d
                    });

                    ACTUAL_RANK = await db_methods.getRankArray(client);
                    console.log(ACTUAL_RANK);

                    for (var i in SOCKET_LIST) {
                        var auxSocket = SOCKET_LIST[i];
                        auxSocket.emit('rank', { rank: ACTUAL_RANK });
                    }

                } else {
                    socket.emit('signInResponse', { success: false });
                }


            });

            socket.on('signUp', async function (data) {

                isTaken = await db_methods.isUsernameTaken(client, data.username)

                if (isTaken) {
                    socket.emit('signUpResponse', { success: false });
                } else {
                    if (await db_methods.addUser(client, data.username, data.password)) {
                        socket.emit('signUpResponse', { success: true });
                    } else {
                        socket.emit('signUpResponse', { success: false });
                    }
                }
            });

            socket.on('disconnect', async function () {
                db_methods.scoreClean(client, socket.id);
                console.log("Desconectado :" + socket.id);
                delete SOCKET_LIST[socket.id];
            });

            socket.on('answer', async function (data) {
                console.log(socket.id + " " + data.choice);
                if (data.choice === PREGUNTA_ACTUAL[0].right) {

                    db_methods.scoreInc1(client, socket.id);

                    socket.emit('feedback', { correcto: true });

                    ACTUAL_RANK = await db_methods.getRankArray(client);
                    console.log(ACTUAL_RANK);

                    for (var i in SOCKET_LIST) {
                        var auxSocket = SOCKET_LIST[i];
                        auxSocket.emit('rank', { rank: ACTUAL_RANK });
                    }

                } else {
                    socket.emit('feedback', { correcto: false });
                }
            });

        });

        setTimeout(async function () {
            PREGUNTA_ACTUAL = await db_methods.findRandomQuestion(client);
            console.log(PREGUNTA_ACTUAL);
            for (var i in SOCKET_LIST) {
                var socket = SOCKET_LIST[i];
                socket.emit('pregunta', {
                    enunciado: PREGUNTA_ACTUAL[0].question,
                    a: PREGUNTA_ACTUAL[0].a,
                    b: PREGUNTA_ACTUAL[0].b,
                    c: PREGUNTA_ACTUAL[0].c,
                    d: PREGUNTA_ACTUAL[0].d
                });
            }
        }, 50);

        setInterval(async function () {

            PREGUNTA_ACTUAL = await db_methods.findRandomQuestion(client);
            console.log(PREGUNTA_ACTUAL);

            for (var i in SOCKET_LIST) {
                var socket = SOCKET_LIST[i];
                socket.emit('pregunta', {
                    enunciado: PREGUNTA_ACTUAL[0].question,
                    a: PREGUNTA_ACTUAL[0].a,
                    b: PREGUNTA_ACTUAL[0].b,
                    c: PREGUNTA_ACTUAL[0].c,
                    d: PREGUNTA_ACTUAL[0].d
                });
            }
            TIEMPO_RESTANTE = TIEMPO_PREGUNTAS;
        }, TIEMPO_PREGUNTAS);

        setInterval(function () {
            TIEMPO_RESTANTE -= TIEMPO_PREGUNTAS / 100;
            //console.log(TIEMPO_RESTANTE * 100 / TIEMPO_PREGUNTAS);
            for (var i in SOCKET_LIST) {
                var socket = SOCKET_LIST[i];
                socket.emit('barraTiempo', { time: TIEMPO_RESTANTE * 100 / TIEMPO_PREGUNTAS });
            }

        }, TIEMPO_PREGUNTAS / 100);

    } catch (e) {
        console.error(e);
    }
})()
