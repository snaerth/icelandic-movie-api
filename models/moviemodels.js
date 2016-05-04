// Create empty movie object
var createMovie = function () {
    return {
        inTheaters : false,
        href: null,
        title: null,
        poster: null,
        posterLocal: null,
        extraimage: [],
        id: null,
        ids: { imdb: null, rotten: null, tmdb: null },
        alternativeTitles: null,
        year: null,
        certificate: null,
        durationMinutes: null,
        country: [],
        releaseDate: null,
        language: null,
        genres: [],
        actors_abridged: [],
        directors_abridged: [],
        writers_abridged: [],
        ratings: { imdb: null, rotten_audience: null, rotten_critics: null },
        showtimes: [{ cinema: null, schedule: [] }],
        omdb: [],
        trailers : []
    };
};


module.exports = createMovie;