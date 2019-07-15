DROP TABLE IF EXISTS weathers;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS movies;
DROP TABLE IF EXISTS yelp;
DROP TABLE locations;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10,7)
);

CREATE TABLE weathers ( 
    id SERIAL PRIMARY KEY, 
    forecast VARCHAR(255), 
    time VARCHAR(255), 
    location_id INTEGER NOT NULL,
    FOREIGN KEY (location_id) REFERENCES locations (id)
  );

  CREATE TABLE events ( 
    id SERIAL PRIMARY KEY, 
    formatted_query VARCHAR(255),
    event_date VARCHAR(255),
    name VARCHAR(255),
    location_id INTEGER NOT NULL,
    link TEXT,
    summary TEXT,
    FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  overview TEXT,
  average_votes FLOAT,
  total_votes INTEGER,
  image_url TEXT,
  popularity FLOAT,
  released_on VARCHAR(255),
  location_id INTEGER NOT NULL,
  created_at DATE,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE yelp (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  image_url TEXT,
  price TEXT,
  rating FLOAT,
  location_id INTEGER NOT NULL,
  url TEXT,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);
