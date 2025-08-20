const TMDB_API_KEY = '9fc333f67be45a47936d39134674e294'; // <-- Replace with your TMDb API key

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const genreSelect = document.getElementById('genre-select');
const movieResults = document.getElementById('movie-results');

let currentPage = 1;
let currentQuery = '';
let currentGenreId = '';
let totalResults = 0;
let genresMap = new Map(); // Maps genre names to IDs

// Fetch genres from TMDb and populate the dropdown
async function fetchGenres() {
  const url = `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.genres) {
    data.genres.forEach(genre => {
      genresMap.set(genre.name, genre.id);
      const option = document.createElement('option');
      option.value = genre.id;
      option.textContent = genre.name;
      genreSelect.appendChild(option);
    });
  }
}

// Fetch movies by search query, genre and page
async function fetchMovies(query, genreId = '', page = 1) {
  if (!query) return [];

  let url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`;

  if (genreId) {
    url += `&with_genres=${genreId}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  if (data && data.results) {
    totalResults = data.total_results || 0;

    return data.results.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image',
      genre_ids: movie.genre_ids || []
    }));
  } else {
    totalResults = 0;
    return [];
  }
}

// Fetch detailed movie info from TMDb
async function fetchMovieDetails(movieId) {
  const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`;
  const res = await fetch(url);
  const data = await res.json();

  if (data) {
    return {
      description: data.overview || 'No description available.',
      director: 'Unknown', // Requires extra calls to credits API (optional)
      runtime: data.runtime ? `${data.runtime} min` : 'Unknown',
      rating: data.vote_average ? `${data.vote_average}/10` : 'N/A',
      genres: data.genres.map(g => g.name).join(', ')
    };
  } else {
    return {
      description: 'No detailed info available.',
      director: 'Unknown',
      runtime: 'Unknown',
      rating: 'N/A',
      genres: ''
    };
  }
}

function createLoadingSpinner() {
  const spinnerContainer = document.createElement('div');
  spinnerContainer.classList.add('loading-spinner');
  const spinner = document.createElement('div');
  spinner.classList.add('spinner');
  spinnerContainer.appendChild(spinner);
  return spinnerContainer;
}

async function showMovieModal(movie) {
  const modalBg = document.createElement('div');
  modalBg.classList.add('modal-bg');

  const modal = document.createElement('div');
  modal.classList.add('modal');

  const closeBtn = document.createElement('button');
  closeBtn.classList.add('modal-close-btn');
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Close modal');
  closeBtn.addEventListener('click', () => document.body.removeChild(modalBg));

  modal.appendChild(closeBtn);

  const modalTitle = document.createElement('h2');
  modalTitle.textContent = movie.title;
  modal.appendChild(modalTitle);

  const loadingSpinner = createLoadingSpinner();
  modal.appendChild(loadingSpinner);

  modalBg.appendChild(modal);
  document.body.appendChild(modalBg);

  try {
    const details = await fetchMovieDetails(movie.id);

    modal.removeChild(loadingSpinner);

    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');

    modalContent.innerHTML = `
      <img src="${movie.poster}" alt="${movie.title} Poster" class="modal-poster" />
      <p><strong>Description:</strong> ${details.description}</p>
      <p><strong>Runtime:</strong> ${details.runtime}</p>
      <p><strong>Rating:</strong> ${details.rating}</p>
      <p><strong>Genres:</strong> ${details.genres}</p>
    `;

    modal.appendChild(modalContent);

  } catch (error) {
    modal.removeChild(loadingSpinner);
    const errorMsg = document.createElement('p');
    errorMsg.textContent = 'Failed to load movie details.';
    modal.appendChild(errorMsg);
  }
}

function createMovieCard(movie) {
  const card = document.createElement('div');
  card.classList.add('movie-card');

  const poster = document.createElement('img');
  poster.src = movie.poster;
  poster.alt = `${movie.title} Poster`;
  poster.classList.add('movie-poster');

  const info = document.createElement('div');
  info.classList.add('movie-info');

  const title = document.createElement('h2');
  title.classList.add('movie-title');
  title.textContent = movie.title;

  const year = document.createElement('p');
  year.classList.add('movie-year');
  year.textContent = `Released: ${movie.year}`;

  info.appendChild(title);
  info.appendChild(year);
  card.appendChild(poster);
  card.appendChild(info);

  card.addEventListener('click', () => {
    showMovieModal(movie);
  });

  return card;
}

async function handleSearch() {
  currentPage = 1;
  currentQuery = searchInput.value.trim();
  currentGenreId = genreSelect.value;
  movieResults.innerHTML = '';

  if (!currentQuery) {
    movieResults.textContent = 'Please enter a movie title to search.';
    return;
  }

  const spinner = createLoadingSpinner();
  movieResults.appendChild(spinner);

  try {
    const movies = await fetchMovies(currentQuery, currentGenreId, currentPage);
    movieResults.innerHTML = '';

    if (movies.length === 0) {
      movieResults.textContent = 'No movies found matching your search.';
      return;
    }

    movies.forEach(movie => {
      const card = createMovieCard(movie);
      movieResults.appendChild(card);
    });

    if (totalResults > currentPage * 20) {
      addLoadMoreButton();
    }

  } catch (error) {
    movieResults.innerHTML = '';
    movieResults.textContent = 'An error occurred while fetching movie data. Please try again later.';
    console.error('Search error:', error);
  }
}

function addLoadMoreButton() {
  const existingBtn = document.querySelector('.load-more-btn');
  if (existingBtn) existingBtn.remove();

  const loadMoreBtn = document.createElement('button');
  loadMoreBtn.textContent = 'Load More';
  loadMoreBtn.classList.add('load-more-btn');

  loadMoreBtn.addEventListener('click', async () => {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';
    currentPage++;

    try {
      const movies = await fetchMovies(currentQuery, currentGenreId, currentPage);
      movies.forEach(movie => {
        const card = createMovieCard(movie);
        movieResults.appendChild(card);
      });

      if (totalResults > currentPage * 20) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More';
      } else {
        loadMoreBtn.remove();
      }
    } catch (error) {
      console.error('Load more error:', error);
      loadMoreBtn.remove();
    }
  });

  movieResults.appendChild(loadMoreBtn);
}

// Initialize genre dropdown then add event listeners
fetchGenres();

searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    handleSearch();
  }
});
