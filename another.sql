-- SQL file for another database
CREATE DATABASE another_db;
USE another_db;

CREATE TABLE example (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100)
);

INSERT INTO example (name) VALUES ('test');

CREATE TABLE mood_readings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL,
    mood_level INT NOT NULL CHECK (mood_level BETWEEN 1 AND 10),
    notes TEXT
);

INSERT INTO mood_readings (date, mood_level, notes) VALUES 
('2026-01-28', 7, 'Feeling good today'),
('2026-01-27', 5, 'A bit tired');