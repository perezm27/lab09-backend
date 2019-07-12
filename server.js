'use strict';

// Application Dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const cors = require('cors');

// Load environment variables from .env file
require('dotenv').config();

// Application Setup
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// API Routes
app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/events', getEvents);
<<<<<<< HEAD
app.get('/movies', getMovies);
=======
app.get('/movies', getMovies)
>>>>>>> 8936bbdf47da3e6d6434dba7d3ae49fd7dc10798

// Make sure the server is listening for requests
app.listen(PORT, () => console.log(`Listening on ${PORT}`));


// Error handler
function handleError(err, res) {
  console.error(err);
  if (res) res.status(500).send('Sorry, something went wrong');
}

// Look for the results in the database
function lookup(options) {
  const SQL = `SELECT * FROM ${options.tableName} WHERE location_id=$1;`;
  const values = [options.location];

  client.query(SQL, values)
    .then(result => {
      if (result.rowCount > 0) {
        options.cacheHit(result);
      } else {
        options.cacheMiss();
      }
    })
    .catch(error => handleError(error));
}

// Models
function Location(query, res) {
  this.tableName = 'locations';
  this.search_query = query;
  this.formatted_query = res.body.results[0].formatted_address;
  this.latitude = res.body.results[0].geometry.location.lat;
  this.longitude = res.body.results[0].geometry.location.lng;
}

Location.lookupLocation = (location) => {
  const SQL = `SELECT * FROM locations WHERE search_query=$1;`;
  const values = [location.query];

  return client.query(SQL, values)
    .then(result => {
      if (result.rowCount > 0) {
        location.cacheHit(result);
      } else {
        location.cacheMiss();
      }
    })
    .catch(console.error);
};

Location.prototype = {
  save: function () {
    const SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id;`;
    const values = [this.search_query, this.formatted_query, this.latitude, this.longitude];

    return client.query(SQL, values)
      .then(result => {
        this.id = result.rows[0].id;
        return this;
      });
  }
};

function Weather(day) {
  this.tableName = 'weathers';
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
}

Weather.tableName = 'weathers';
Weather.lookup = lookup;

Weather.prototype = {
  save: function (location_id) {
    const SQL = `INSERT INTO ${this.tableName} (forecast, time, location_id) VALUES ($1, $2, $3);`;
    const values = [this.forecast, this.time, location_id];

    client.query(SQL, values);
  }
};

function Event(event) {
  this.tableName = 'events';
  this.link = event.url;
  this.name = event.name.text;
  this.event_date = new Date(event.start.local).toString().slice(0, 15);
  this.summary = event.summary;
}

Event.tableName = 'events';
Event.lookup = lookup;

Event.prototype = {
  save: function (location_id) {
    const SQL = `INSERT INTO ${this.tableName} (link, name, event_date, summary, location_id) VALUES ($1, $2, $3, $4, $5);`;
    const values = [this.link, this.name, this.event_date, this.summary, location_id];

    client.query(SQL, values);
  }
};

function Movies(movie) {
  this.tableName = 'movies';
  this.title = movie.original_title;
  this.overview = movie.overview;
  this.average_votes = movie.vote_average;
  this.total_votes = movie.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
  this.popularity = movie.popularity;
  this.released_on = movie.release_date;
}

Movies.tableName = 'movies';
Movies.lookup = lookup;

Movies.prototype = {
  save: function (location_id) {
    const SQL = `INSERT INTO ${this.tableName} (title, overview, average_votes, total_votes, image_url, popularity, released_on, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`;

    const values = [this.title, this.overview, this.average_votes, this.total_votes, this.image_url, this.popularity, this.released_on, location_id];

    client.query(SQL, values)
  }
}

function getLocation(request, response) {
  Location.lookupLocation({
    tableName: Location.tableName,

    query: request.query.data,

    cacheHit: function (result) {
      response.send(result.rows[0]);
    },

    cacheMiss: function () {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${this.query}&key=${process.env.GEOCODE_API_KEY}`;

      return superagent.get(url)
        .then(result => {
          const location = new Location(this.query, result);
          location.save()
            .then(location => response.send(location));
        })
        .catch(error => handleError(error));
    }
  });
}

function getWeather(request, response) {
  Weather.lookup({
    tableName: Weather.tableName,

    location: request.query.data.id,

    cacheHit: function (result) {
      response.send(result.rows);
    },

    cacheMiss: function () {
      const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

      superagent.get(url)
        .then(result => {
          const weatherSummaries = result.body.daily.data.map(day => {
            const summary = new Weather(day);
            summary.save(request.query.data.id);
            return summary;
          });
          response.send(weatherSummaries);
        })
        .catch(error => handleError(error, response));
    }
  });
}

function getEvents(request, response) {
  Event.lookup({
    tableName: Event.tableName,

    location: request.query.data.id,

    cacheHit: function (result) {
      response.send(result.rows);
    },

    cacheMiss: function () {
      const url = `https://www.eventbriteapi.com/v3/events/search?token=${process.env.EVENTBRITE_API_KEY}&location.address=${request.query.data.formatted_query}`;

      superagent.get(url)
        .then(result => {
          const events = result.body.events.map(eventData => {
            const event = new Event(eventData);
            event.save(request.query.data.id);
            return event;
          });

          response.send(events);
        })
        .catch(error => handleError(error, response));
    }
  });
}

function getMovies(request, response) {
  Movies.lookup({
    tableName: Movies.tableName,

    location: request.query.data.id,

<<<<<<< HEAD


=======
>>>>>>> 8936bbdf47da3e6d6434dba7d3ae49fd7dc10798
    cacheHit: function (result) {
      response.send(result.rows);
    },

    cacheMiss: function () {
      const locationName = request.query.data.search_query;
<<<<<<< HEAD
      const url = `https://api.themoviedb.org/3/movie/550?api_key=${process.env.MOVIE_API_KEY}&query=${locationName}`;

      superagent.get(url)
        .then(result => {
          const movieDatas = result.body;
          console.log('testing result', movieDatas);
          const movies = Object.entries(result).map(movieData => {
            const movie = new Movies(movieDatas);
=======
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&query=${locationName}`;

      superagent.get(url)
        .then(result => {
          const movies = result.body.results.map(movieData => {
            const movie = new Movies(movieData);
>>>>>>> 8936bbdf47da3e6d6434dba7d3ae49fd7dc10798
            movie.save(request.query.data.id);
            return movie;
          });

          response.send(movies);
        })
        .catch(error => handleError(error, response));
    }
  })
}
