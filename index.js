const express = require("express");
// mysql2 is a NodeJS client to do CRUD with MySQL/MariaDB
const mysql2 = require("mysql2/promise");
// ejs is embedded JavaScript (is a way to create templates for a dynamic web app)
// a template file is a reusable HTML code which express can
// send back to the client
const ejs = require("ejs");
require('dotenv').config({ path: './SQL/.env' });

console.log("Application starting...");

const app = express();
const port = 3000;

// setup EJS
app.set('view engine', 'ejs'); // tell Express that we are using EJS as the template engine
app.set('views', './SQL/views'); // tell Express where all the templates are

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
    console.log('GET /food-entries - Fetching all food entries');
    const search = req.query.search;
    console.log('Search term:', search);
    let sql = `
        SELECT fe.*, 
               GROUP_CONCAT(DISTINCT t.name) as tags,
               GROUP_CONCAT(DISTINCT c.name) as categories
        FROM food_entries fe
        LEFT JOIN food_entries_tags fet ON fe.id = fet.food_entry_id
        LEFT JOIN tags t ON fet.tag_id = t.id
        LEFT JOIN food_entries_categories fec ON fe.id = fec.food_entry_id
        LEFT JOIN categories c ON fec.category_id = c.id
    `;
    let whereClause = '';
    let params = [];
    if (search) {
        whereClause = 'WHERE fe.foodName LIKE ? OR fe.description LIKE ?';
        params = [`%${search}%`, `%${search}%`];
    }
    sql += whereClause + ' GROUP BY fe.id';
    console.log('SQL:', sql);
    console.log('Params:', params);
    const results = await dbConnection.query(sql, params);
    const rows = results[0];
    
    // Convert tags and categories from comma-separated string to array
    rows.forEach(row => {
        row.tags = row.tags ? row.tags.split(',') : [];
        row.categories = row.categories ? row.categories.split(',') : [];
    });
   
    console.log(`Found ${rows.length} food entries`);
    res.render('food_entries', {
        foodEntries: rows,
        search: search
    })

})

// display the form
app.get("/food-entries/create", async function(req,res){
    const [tags] = await dbConnection.execute('SELECT * FROM tags');
    const [categories] = await dbConnection.execute('SELECT * FROM categories');
    const [foods] = await dbConnection.execute('SELECT * FROM foods ORDER BY name');
    const [units] = await dbConnection.execute('SELECT * FROM units ORDER BY name');
    res.render('create_food_entries', {
        tags: tags,
        categories: categories,
        foods: foods,
        units: units
    });
})

// process the form
app.post('/food-entries/create', async function(req,res){
    console.log('POST /food-entries/create - Creating new food entry');
    const { dateTime, foodName, calories, servingSize, meal, tags, unit, description, categories} = req.body;
    console.log('Received data:', { dateTime, foodName, calories, servingSize, meal, tags, unit, description, categories });
    console.log('Tags type:', Array.isArray(tags) ? 'array' : typeof tags);
    console.log('Categories type:', Array.isArray(categories) ? 'array' : typeof categories);
    
    // Normalize tags and categories to arrays
    const tagArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
    const categoryArray = Array.isArray(categories) ? categories : (categories ? [categories] : []);
    
    console.log('Normalized tags:', tagArray);
    console.log('Normalized categories:', categoryArray);
    const sql = `INSERT INTO food_entries (dateTime, foodName, calories, meal, servingSize, unit, description)
       VALUES(?, ?, ?, ?, ?, ?, ?);`

    const values = [dateTime, foodName, calories, meal, servingSize, unit, description || '' ];
    console.log(values);
    const results = await dbConnection.execute(sql, values);
    const foodEntryId = results[0].insertId;
    console.log(results);

    // Insert tags into junction table
    if (tagArray && tagArray.length > 0) {
        console.log(`Inserting ${tagArray.length} tags for food entry ${foodEntryId}`);
        for (const tagName of tagArray) {
            // Get tag_id
            const [tagRows] = await dbConnection.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
            if (tagRows.length > 0) {
                const tagId = tagRows[0].id;
                await dbConnection.execute('INSERT INTO food_entries_tags (food_entry_id, tag_id) VALUES (?, ?)', [foodEntryId, tagId]);
            }
        }
    }

    // Insert categories into junction table
    if (categoryArray && categoryArray.length > 0) {
        console.log(`Inserting ${categoryArray.length} categories for food entry ${foodEntryId}`);
        for (const categoryName of categoryArray) {
            // Get category_id
            const [categoryRows] = await dbConnection.execute('SELECT id FROM categories WHERE name = ?', [categoryName]);
            if (categoryRows.length > 0) {
                const categoryId = categoryRows[0].id;
                await dbConnection.execute('INSERT INTO food_entries_categories (food_entry_id, category_id) VALUES (?, ?)', [foodEntryId, categoryId]);
            }
        }
    }

    console.log('Food entry created successfully');
    res.redirect('/food-entries')
})

app.get('/food-entries/edit/:foodRecordID', async function(req,res){
    const foodRecordID = req.params.foodRecordID;
    console.log(`GET /food-entries/edit/${foodRecordID} - Fetching food entry for editing`);
    const [foodEntries] = await dbConnection.execute(`
        SELECT fe.*, 
               GROUP_CONCAT(DISTINCT t.name) as tags,
               GROUP_CONCAT(DISTINCT c.name) as categories
        FROM food_entries fe
        LEFT JOIN food_entries_tags fet ON fe.id = fet.food_entry_id
        LEFT JOIN tags t ON fet.tag_id = t.id
        LEFT JOIN food_entries_categories fec ON fe.id = fec.food_entry_id
        LEFT JOIN categories c ON fec.category_id = c.id
        WHERE fe.id = ?
        GROUP BY fe.id`, 
    [foodRecordID]);
    const foodEntry = foodEntries[0];
    foodEntry.tags = foodEntry.tags ? foodEntry.tags.split(',') : [];
    foodEntry.categories = foodEntry.categories ? foodEntry.categories.split(',') : [];
    
    const [allTags] = await dbConnection.execute('SELECT * FROM tags');
    const [allCategories] = await dbConnection.execute('SELECT * FROM categories');
    const [allFoods] = await dbConnection.execute('SELECT * FROM foods ORDER BY name');
    const [allUnits] = await dbConnection.execute('SELECT * FROM units ORDER BY name');
    
    console.log('Food entry data:', foodEntry);
    res.render('edit_food_entries',{
        foodEntry,
        tags: allTags,
        categories: allCategories,
        foods: allFoods,
        units: allUnits
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
    console.log(`POST /food-entries/edit/${foodEntryID} - Updating food entry`);
    console.log('Edit data:', req.body);
    
    // Normalize tags and categories to arrays
    const tagArray = Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? [req.body.tags] : []);
    const categoryArray = Array.isArray(req.body.categories) ? req.body.categories : (req.body.categories ? [req.body.categories] : []);
    
    console.log('Normalized edit tags:', tagArray);
    console.log('Normalized edit categories:', categoryArray);
    const sql = `UPDATE food_entries SET dateTime=?,
                        foodName=?,
                        calories=?,
                        meal=?,
                        servingSize=?,
                        unit=?,
                        description=?
                     WHERE id =?;`
    const bindings = [
        req.body.dateTime, 
        req.body.foodName, 
        req.body.calories,
        req.body.meal,
        req.body.servingSize,
        req.body.unit,
        req.body.description || '',
        foodEntryID
    ];
    console.log(bindings);
    
    const results = await dbConnection.execute(sql, bindings)

    // Delete old tags
    await dbConnection.execute('DELETE FROM food_entries_tags WHERE food_entry_id = ?', [foodEntryID]);

    // Insert new tags
    if (tagArray && tagArray.length > 0) {
        console.log(`Updating tags: ${tagArray.join(', ')}`);
        for (const tagName of tagArray) {
            const [tagRows] = await dbConnection.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
            if (tagRows.length > 0) {
                const tagId = tagRows[0].id;
                await dbConnection.execute('INSERT INTO food_entries_tags (food_entry_id, tag_id) VALUES (?, ?)', [foodEntryID, tagId]);
            }
        }
    }

    // Delete old categories
    await dbConnection.execute('DELETE FROM food_entries_categories WHERE food_entry_id = ?', [foodEntryID]);

    // Insert new categories
    if (categoryArray && categoryArray.length > 0) {
        console.log(`Updating categories: ${categoryArray.join(', ')}`);
        for (const categoryName of categoryArray) {
            const [categoryRows] = await dbConnection.execute('SELECT id FROM categories WHERE name = ?', [categoryName]);
            if (categoryRows.length > 0) {
                const categoryId = categoryRows[0].id;
                await dbConnection.execute('INSERT INTO food_entries_categories (food_entry_id, category_id) VALUES (?, ?)', [foodEntryID, categoryId]);
            }
        }
    }

    console.log('Food entry updated successfully');
    res.redirect('/food-entries')
})

// process the delete
app.post('/food-entries/delete/:foodRecordID', async function(req,res){
    const foodID = req.params.foodRecordID;
    console.log(`POST /food-entries/delete/${foodID} - Deleting food entry`);
    const sql = `DELETE FROM food_entries WHERE id = ?;`
    const results = await dbConnection.execute(sql, [foodID]);
    console.log('Food entry deleted successfully');
    res.redirect('/food-entries')
})

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});