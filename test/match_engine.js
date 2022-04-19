// These are only logical test for reply in a prod

// Dado un numero de usuarios que ingresan en una linea de tiempo constante se deben evacuar emparejándose 
// lo mas pronto posible, cumpliendo ciertos criterios

// - El ritmo de tiempo debe ser el mismo
// - El rango de elo es de 100 puntos + / -
// - Si un usuario enviá el color, se le debe respetar y emparejar con el color adverso
// - preferiblemente se debe emparejar con el mismo país o idioma


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
const users = [
    {
        "uidUser": "A",
        "time": "10",
        "lang": "es",
        "elo": "1555",
        "color": "",
        "country": "Col"
    },
    {
        "uidUser": "B",
        "time": "10",
        "lang": "es",
        "elo": "1120",
        "color": "",
        "country": "Ven"
    },
    {
        "uidUser": "C",
        "time": "5",
        "lang": "es",
        "elo": "1682",
        "color": "W",
        "country": "Esp"
    },
    {
        "uidUser": "D",
        "time": "10",
        "lang": "es",
        "elo": "1700",
        "color": "",
        "country": "Bol"
    },
    {
        "uidUser": "E",
        "time": "10",
        "lang": "es",
        "elo": "2556",
        "color": "",
        "country": "Col"
    },
    {
        "uidUser": "F",
        "time": "10",
        "lang": "es",
        "elo": "1824",
        "color": "",
        "country": "Hon"
    },
    {
        "uidUser": "G",
        "time": "10",
        "lang": "en",
        "elo": "1921",
        "color": "",
        "country": "Usa"
    },
    {
        "uidUser": "H",
        "time": "10",
        "lang": "es",
        "elo": "1622",
        "color": "",
        "country": "Col"
    },
    {
        "uidUser": "I",
        "time": "10",
        "lang": "es",
        "elo": "1457",
        "color": "",
        "country": "Col"
    },
    {
        "uidUser": "J",
        "time": "10",
        "lang": "es",
        "elo": "2457",
        "color": "",
        "country": "Col"
    },
    {
        "uidUser": "K",
        "time": "10",
        "lang": "es",
        "elo": "1425",
        "color": "",
        "country": "Col"
    },
    {
        "uidUser": "L",
        "time": "15",
        "lang": "es",
        "elo": "1478",
        "color": "",
        "country": "Col"
    },
    {
        "uidUser": "M",
        "time": "5",
        "lang": "es",
        "elo": "1930",
        "color": "",
        "country": "Col"
    },
    {
        "uidUser": "N",
        "time": "10",
        "lang": "es",
        "elo": "1555",
        "color": "",
        "country": "Col"
    }
];

/*
* Match (Sin validar la mejor opción -idioma , país- haciendo match con la primera coincidencia viable)
*/

// -- In boat logs
// ^ permanece en el bote
// != no cumple condición (!= elo) no cumple condición del elo
// ==> Entra
// <== Sale
// !! Coincide

// En el bote
//  B , C , G, L , M, N

// {
//     "uidUser": "N",
//     "time": "10",
//     "lang": "es",
//     "elo": "1555",
//     "color": "",
//     "country": "Col"
// }

// ==> A
// ==> B (A != B) ^
// ==> C (A, B != tiempo) ^
// ==> D (A, B != elo), (C != tiempo) ^
// ==> E (A, B, C, D != elo) ^
// ==> F (A, B, C != elo), D!!
// <== F, D
// ==> G (A, B, C, E  != elo) ^
// ==> H A!!
// <== A, H
// ==> I (B, C, E, G != elo) ^
// ==> J (B, C != elo), E!!
// <== E - J
// ==> K (B, C != elo), I!!
// <== I, K
// ==> L (B, C, G != elo) ^
// ==> M (B, C, L != elo), (G != tiempo) ^
// ==> N (B, C, G != elo), (L, M != tiempo)

// -- Match
// D - F
// A - H
// E - J
// I - K
