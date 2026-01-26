USE food_tracker;

CREATE TABLE tags (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL
) ENGINE = INNODB;

CREATE TABLE food_entries_tags (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    food_entry_id INT NOT NULL,
    tag_id INT UNSIGNED NOT NULL,
   
    -- Add foreign key constraints
    FOREIGN KEY (food_entry_id)
        REFERENCES food_entries(id)
        ON DELETE CASCADE,
   
    FOREIGN KEY (tag_id)
        REFERENCES tags(id)
        ON DELETE CASCADE
) ENGINE = INNODB;

INSERT INTO tags (name) VALUES ("Vegan"),
    ("Vegetarian"),
    ("Glutten Free"),
    ("Low Carb"),
    ("Low Fat");