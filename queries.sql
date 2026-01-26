-- Create food_tracker database
CREATE DATABASE IF NOT EXISTS food_tracker;
USE food_tracker;

-- Create food_entries table
CREATE TABLE IF NOT EXISTS food_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dateTime DATETIME NOT NULL,
    foodName VARCHAR(255) NOT NULL,
    calories INT NOT NULL,
    meal VARCHAR(50) NOT NULL,
    tags JSON,
    servingSize DECIMAL(10, 2),
    unit VARCHAR(50),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sample queries
-- SELECT all food entries
SELECT * FROM food_entries;

-- SELECT food entries for a specific date
SELECT * FROM food_entries WHERE DATE(dateTime) = '2024-01-26';

-- SELECT total calories by meal type
SELECT meal, SUM(calories) as total_calories FROM food_entries GROUP BY meal;

-- SELECT total calories by date
SELECT DATE(dateTime) as date, SUM(calories) as total_calories FROM food_entries GROUP BY DATE(dateTime);
