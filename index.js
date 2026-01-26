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
    const sql = `
        SELECT fe.*, GROUP_CONCAT(t.name) as tags
        FROM food_entries fe
        LEFT JOIN food_entries_tags fet ON fe.id = fet.food_entry_id
        LEFT JOIN tags t ON fet.tag_id = t.id
        GROUP BY fe.id
    `
    const results = await dbConnection.query(sql);
    const rows = results[0];
    
    // Convert tags from comma-separated string to array
    rows.forEach(row => {
        row.tags = row.tags ? row.tags.split(',') : [];
    });
   
    res.render('food_entries', {
        foodEntries: rows
    })

})

// display the form
app.get("/food-entries/create", async function(req,res){
    const [tags] = await dbConnection.execute('SELECT * FROM tags');
    res.render('create_food_entries', {
        tags: tags
    });
})

// process the form
app.post('/food-entries/create', async function(req,res){
    const { dateTime, foodName, calories, servingSize, meal, tags, unit} = req.body;
    const sql = `INSERT INTO food_entries (dateTime, foodName, calories, meal, servingSize, unit)
       VALUES(?, ?, ?, ?, ?, ?);`

    const values = [dateTime, foodName, calories, meal, servingSize, unit ];
    console.log(values);
    const results = await dbConnection.execute(sql, values);
    const foodEntryId = results[0].insertId;
    console.log(results);

    // Insert tags into junction table
    if (tags && Array.isArray(tags)) {
        for (const tagName of tags) {
            // Get tag_id
            const [tagRows] = await dbConnection.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
            if (tagRows.length > 0) {
                const tagId = tagRows[0].id;
                await dbConnection.execute('INSERT INTO food_entries_tags (food_entry_id, tag_id) VALUES (?, ?)', [foodEntryId, tagId]);
            }
        }
    }

    res.redirect('/food-entries')
})

app.get('/food-entries/edit/:foodRecordID', async function(req,res){
    const foodRecordID = req.params.foodRecordID;
    const [foodEntries] = await dbConnection.execute(`
        SELECT fe.*, GROUP_CONCAT(t.name) as tags
        FROM food_entries fe
        LEFT JOIN food_entries_tags fet ON fe.id = fet.food_entry_id
        LEFT JOIN tags t ON fet.tag_id = t.id
        WHERE fe.id = ?
        GROUP BY fe.id`, 
    [foodRecordID]);
    const foodEntry = foodEntries[0];
    foodEntry.tags = foodEntry.tags ? foodEntry.tags.split(',') : [];
    
    const [allTags] = await dbConnection.execute('SELECT * FROM tags');
    
    res.render('edit_food_entries',{
        foodEntry,
        tags: allTags
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
                        servingSize=?,
                        unit=?
                     WHERE id =?;`
    const bindings = [
        req.body.dateTime, 
        req.body.foodName, 
        req.body.calories,
        req.body.meal,
        req.body.servingSize,
        req.body.unit,
        foodEntryID
    ];
    console.log(bindings);
    
    const results = await dbConnection.execute(sql, bindings)

    // Delete old tags
    await dbConnection.execute('DELETE FROM food_entries_tags WHERE food_entry_id = ?', [foodEntryID]);

    // Insert new tags
    if (req.body.tags && Array.isArray(req.body.tags)) {
        for (const tagName of req.body.tags) {
            const [tagRows] = await dbConnection.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
            if (tagRows.length > 0) {
                const tagId = tagRows[0].id;
                await dbConnection.execute('INSERT INTO food_entries_tags (food_entry_id, tag_id) VALUES (?, ?)', [foodEntryID, tagId]);
            }
        }
    }

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