const express = require('express');


const app = express();

//TODO: Verbinde eine Datenbank dazu

//TODO: Schreibe requests/responses


app.get('/', (req, res) => {
    res.send('request received');
});

app.get('/ralf', (req, res) => {
    res.send('vielen Dank Ralf');
});


app.listen(3050, "localhost", () => {
    console.log("bald wird es Mittagspause")
});