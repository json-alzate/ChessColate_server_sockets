# Servidor ChessColate sockets.<!-- omit in toc -->

### Tabla de Contenido<!-- omit in toc -->

- [1- Narrativa](#1--narrativa)
- [2- Sockets](#2--sockets)
    - [1_in_matchEngine_requestGame (userRequestToPlay):](#1_in_matchengine_requestgame-userrequesttoplay)
    - [2_out_matchEngine_readyMatch(game)):](#2_out_matchengine_readymatchgame)
- [3- Modelos](#3--modelos)
    - [userRequestToPlay](#userrequesttoplay)
    - [game](#game)
    - [clock](#clock)
    - [chessInstance](#chessinstance)



## 1- Narrativa

Todo comienza cuando un usuario solicita ser emparejado para un juego mediante un evento a travez de un socket ([1_in_matchEngine_requestGame](#1_in_matchengine_requestgame-userrequesttoplay)). 
Cuando el servidor recibe la solicitud, se verifica que se este escuchando el 'bote' (es un arreglo con objetos [userRequestToPlay]#userrequesttoplay) ) desde firebase, y si no se esta escuchando, se realiza el llamado para cargar el estado del bote. Posteriormente,
se verifica si en el bote se tiene otro usuario con el que se pueda realizar el match. Si no se tiene, se adiciona el usuario al bote y queda a la espera de que llegue otros usuario con el que se pueda emparejar. Si se ha logrado emparejar, se crea una [partida](#game) y se envía la información de la partida al usuario que solicito el match por otro socket ([2_out_matchEngine_readyMatch](#2_out_matchengine_readymatchgame)) , A su vez se registra la partida en firebase y se crea el reloj (se almacena en un arreglo [clock](#clock)) para la partida.
Luego se crea un objeto ([chessInstance](#chessinstance)) que se almacena en un arreglo para realizar validaciones sobre los movimientos enviados para la partida.

## 2- Sockets
#### 1_in_matchEngine_requestGame ([userRequestToPlay](#userrequesttoplay)): 
Cuando un usuario solicita emparejarse para jugar.

#### 2_out_matchEngine_readyMatch([game](#game))):
Comunica al usuario que se ha emparejado con otro usuario. y envía la información de la partida.

## 3- Modelos

#### userRequestToPlay
```
     - uidUser: string;
     - time: number; // tiempo para el juego ejm: 10 minutes
     - lang: string; // 2 caracteres
     - elo: number;
     - color: white | black | random;
     - country: string; // 3 caracteres
     - createAt: number; //(auto generado al ingresar al bote) / fecha para dar prioridad si lleva mucho tiempo esperando
```

#### game 
```
    - uid: string //(auto generado)
    - uidUserWhite: string;
    - uidUserBlack: string;
    - timeControl: number; // tiempo para el juego ejm: 10 minutes
    - createAt: number;
    - uidClock: string; //(auto generado)
    - uidChessInstance: string; //(auto generado)
```

#### clock
```
    - uid: string //(auto generado)
    - uidGame: string;
    - timerWhite: any; // objeto timeOut
    - timerBlack: any; // objeto timeOut
```

#### chessInstance
```
    - uid: string //(auto generado)
    - chessInstance: any;
    - uidGame: string;
    - fens: string[];
    - moves: string[];
```