const express = require("express");
// mysql2 is a NodeJS client to do CRUD with MySQL/MariaDB
const mysql2 = require("mysql2/promise");
// ejs is embedded JavaScript (is a way to create templates for a dynamic web app)
// a template file is a reusable HTML code which express can
// send back to the client
const ejs = require("ejs");
require('dotenv').config();

const app = express();
const port = 3000;

// setup EJS
app.set('view engine', 'ejs'); // tell Express that we are using EJS as the template engine
app.set('views', './views'); // tell Express where all the templates are

// enable forms processing on the server side
app.use(express.urlencoded({
    extended: true
}))

// Create a new connection pool
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
}
// a pool of database connection
// a connection a "data pipeline" between your app and the database
// it can handles a finite amount of traffic, usually one
// the pool can handle the demand dynamically
// it can detect when there's a "queue" and create a new connections when needed
// and in times of low traffic
const dbConnection = mysql2.createPool(dbConfig);

app.get('/food-entries', async function(req, res){
    const sql = 'SELECT * FROM food_entries'
    // .query is a way to send SQL commands the database
    // the return will be array of information
    const results = await dbConnection.query(sql);
    const rows = results[0];
   
    res.render('food_entries', {
        foodEntries: rows
    })

})

// display the form
app.get("/food-entries/create", function(req,res){

    res.render('create_food_entries');
})

// process the form
app.post('/food-entries/create', async function(req,res){
    const { dateTime, foodName, calories, servingSize, meal, tags, unit} = req.body;
    const sql = `INSERT INTO food_entries (dateTime, foodName, calories, meal, tags, servingSize, unit)
       VALUES(?, ?, ?, ?, ?, ?, ?);`

    const values = [dateTime, foodName, calories, meal, JSON.stringify(tags), servingSize, unit ];
    console.log(values);
    // dbConnection.execute will run SQL in prepared mode
    const results = await dbConnection.execute(sql, values);
    console.log(results);

    res.redirect('/food-entries')
})

app.get('/food-entries/edit/:foodRecordID', async function(req,res){
    const foodRecordID = req.params.foodRecordID;
    const [foodEntries] = await dbConnection.execute(`
        SELECT * FROM food_entries WHERE id = ?`, 
    [foodRecordID]);
    const foodEntry = foodEntries[0];
    foodEntry.tags = JSON.parse(foodEntry.tags);
    res.render('edit_food_entries',{
        foodEntry
    })
})

// display the confirmation form
app.get('/food-entries/delete/:foodRecordID', async function(req,res){
    const foodRecordID = req.params.foodRecordID;
    const sql = "SELECT * FROM food_entries WHERE id = ?";
    const [foodEntries] = await dbConnection.execute(sql, [foodRecordID] );
    const foodEntry = foodEntries[0];
    res.render('confirm_delete', {
        foodEntry
    })
});

app.post('/food-entries/edit/:foodRecordID', async function(req,res){
    const foodEntryID = req.params.foodRecordID;
    const sql = `UPDATE food_entries SET dateTime=?,
                        foodName=?,
                        calories=?,
                        meal=?,
                        tags=?,
                        servingSize=?,
                        unit=?
                     WHERE id =?;`
    const bindings = [
        req.body.dateTime, 
        req.body.foodName, 
        req.body.calories,
        req.body.meal,
        JSON.stringify(req.body.tags),
        req.body.servingSize,
        req.body.unit,
        foodEntryID
    ];
    console.log(bindings);
    
    const results = await dbConnection.execute(sql, bindings)

    res.redirect('/food-entries')
})

// process the delete
app.post('/food-entries/delete/:foodRecordID', async function(req,res){
    const sql = `DELETE FROM food_entries WHERE id = ?;`
    const foodID = req.params.foodRecordID;
    const results = await dbConnection.execute(sql, [foodID]);
    res.redirect('/food-entries')
})

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});