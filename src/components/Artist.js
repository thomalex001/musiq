import { useState, useEffect } from 'react';
import { API } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
// import QuizCard from './QuizCard';

const Artist = () => {
  const [artistAlbumsData, setArtistAlbumsData] = useState([]);
  const artist = useParams();
  const navigate = useNavigate();
  const [quizStarted, setQuizStarted] = useState(false);
  const [yearAnswersArray, setYearAnswersArray] = useState([]);
  const [albumAnswersArray, setAlbumAnswersArray] = useState([]);
  const [questionAnswered, setQuestionAnswered] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState({});
  const [nextButtonIsClicked, setNextButtonIsClicked] = useState(false); 
  const [country, setCountry] = useState(['']);
  const [albumTrackAnswersArray, setAlbumTrackAnswersArray] = useState([]); // Store the fetched album tracks
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState(null); // Error state
  const [randomTrack, setRandomTrack] = useState(null); // Error state
  const [incorrectAnswersArray, setIncorrectAnswersArray] = useState(''); // Error state

  //********GET CURRENT YEAR TO AVOID SHOWING A YEAR IN THE FUTURE IN HANDLE_ANSWER_CLICK********//
  const today = new Date();
  const currentYearStr = `${today.getFullYear()}`;
  const currentYearInt = parseInt(currentYearStr);

  //********CHECK IF IMAGE FROM ALBUMS IS A VALID IMAGE********//
  // const isImageValid = async (url) => {
  //   try {
  //     const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
  //     return (
  //       response.ok && response.headers.get('Content-Type').includes('image')
  //     );
  //   } catch (e) {
  //     return false;
  //   }
  // };

  //********FETCH ONLY ALBUMS WITH A UNIQUE MASTER ID********//
  const fetchAlbumsWithUniqueMasterId = async (artistId, country) => {
    return API.GET(API.ENDPOINTS.getArtistAlbums(artistId, country))
      .then(({ data }) => {
        const seenMasterIds = new Set();
        const uniqueAlbums = [];
        data.results.forEach((album) => {
          if (album.master_id && !seenMasterIds.has(album.master_id)) {
            seenMasterIds.add(album.master_id);
            uniqueAlbums.push(album);
            // console.log("DATA", data)
          }
        });
        // console.log("UNIQUE ALBUMS", uniqueAlbums)
        //********FILTER OUT ALBUMS WITH SPACER.GIF AS A COVER_IMAGE AS IT SHOWS A SINGLE PIXEL********//
        return uniqueAlbums.filter(
          (album) => album.cover_image?.slice(-10) !== 'spacer.gif'
        );
      })
      .catch((e) => {
        console.error('Error fetching albums for country:', country, e);
        return [];
      });
  };
  //********FETCH ALBUMS FROM DIFFERENT COUNTRIES********//
  const fetchAlbumsForAllCountries = async (artistId) => {
    const countries = ['US'];
    let albumsFromAllCountries = [];
    let countFromAllCountries = [];
    let albumsFromTopCountry = [];

    for (const country of countries) {
      const countryAlbums = await fetchAlbumsWithUniqueMasterId(
        artistId,
        country
      );
      countFromAllCountries.push({ country, count: countryAlbums.length });
      albumsFromAllCountries = [...albumsFromAllCountries, ...countryAlbums]; // Collect albums from all countries
    }
    //********FIND THE COUNTRY WITH THE MOST ALBUMS********//
    const topCountry = countFromAllCountries.reduce(
      (max, current) => {
        return current.count > max.count ? current : max;
      },
      { country, count: 0 }
    );
    //********FILTER TO RETURN ALBUMS FROM TOP COUNTRY ONLY********//
    // console.log("TOP COUNTRY IS", topCountry.country)

    // console.log("ALBUMS FROM ALL COUNTRIES", albumsFromAllCountries)
    albumsFromTopCountry = albumsFromAllCountries.filter(
      (album) => album.country === topCountry.country
    );
    setArtistAlbumsData(albumsFromTopCountry); // Set all albums from all countries
    setCountry(topCountry.country); // Set the country with the most albums
    setLoading(false);
    // console.log("ALBUMS FROM TOP COUNTRY", albumsFromTopCountry)
  };

  //********FETCH ALBUM WHEN ARTIST ID CHANGES********//
  useEffect(() => {
    if (artist.id) {
      fetchAlbumsForAllCountries(artist.id);
    }
  }, [artist.id, country]);

  if (loading) return <div>Loading...</div>;

  const gotoAlbum = (albumId) => navigate(`/artist/album/${albumId}`);
  const albums = artistAlbumsData;
  // console.log('ALBUMS', albums);

  //********FUNCTION TO GET ONE RANDOM ALBUM FOR THE QUIZ********//
  const getRandomAlbum = () => {
    if (albums.length > 0) {
      const randomAlbumIndex = Math.floor(Math.random() * albums.length);
      const selectedAlbum = albums[randomAlbumIndex];

      console.log(
        'SELECTED ALBUM',
        selectedAlbum.id,
        ' - ',
        selectedAlbum.title,
        ' - ',
        selectedAlbum.year
      );

      //********CALL EITHER QUESTION 1, 2 or 3.********//
      const randomQuestion = [
        nameTheAlbumQuestion,
        nameTheYearQuestion,
        nameTheAlbumTrackQuestion
      ];
      const randomQuestionIndex = Math.floor(Math.random() * 3);
      randomQuestion[randomQuestionIndex](selectedAlbum);
      // nameTheAlbumTrackQuestion(selectedAlbum);
      getSelectedAlbumDetails(selectedAlbum);
      setQuizStarted(true);
      setNextButtonIsClicked(true);
      setQuestionAnswered(false);
      setSelectedAlbum(selectedAlbum);
    }
  };

  //********QUESTION 1:******************************************//
  //********WHAT IS THE NAME OF THE ALBUM?********//
  //********FILTER OUT ANSWERS SO THAT REMAINING ALBUMS ARE NOT THE SAME AS SELECTED ALBUM********//
  const nameTheAlbumQuestion = (selectedAlbum) => {
    console.log('-- NAMETHEALBUMQUESTION');
    const remainingAlbums = albums.filter(
      (album) => album.title.slice(-3) !== selectedAlbum.title.slice(-3)
    );

    //********RANDOMLY SELECT TWO INCORRECT ANSWERS********//
    const randomIncorrectAnswers = [];
    while (randomIncorrectAnswers.length < 2) {
      const index = Math.floor(Math.random() * remainingAlbums.length);
      if (!randomIncorrectAnswers.includes(index)) {
        randomIncorrectAnswers.push(index);
      }
    }
    //********ENSURE THE 2 INCORRECT ANSWERS DO NOT HAVE THE SAME TITLE********//
    const incorrectAnswers = randomIncorrectAnswers.map(
      (index) => remainingAlbums[index]
    );
    if (
      incorrectAnswers[0].title.length >= 3 &&
      incorrectAnswers[1].title.length >= 3 &&
      incorrectAnswers[0].title.slice(-3) ===
        incorrectAnswers[1].title.slice(-3)
    ) {
      getRandomAlbum();
      return;
    }
    const albumAnswersArray = [selectedAlbum, ...incorrectAnswers];
    const shuffledAnswers = shuffleAnswers(albumAnswersArray);
    setAlbumAnswersArray(shuffledAnswers);
    setYearAnswersArray([]);
  };

  //********SHUFFLE ANSWERS********//
  const shuffleAnswers = (answers) => {
    return answers.sort(() => Math.random() - 0.5);
  };
  //********QUESTION 2:******************************************//
  //********WHAT YEAR THIS ALBUM WAS FIRST RELEASED?********//
  const nameTheYearQuestion = (selectedAlbum) => {
    const yearOfAlbum = parseInt(selectedAlbum.year);
    console.log('-- NAMETHEYEARQUESTION', selectedAlbum);
    const randomYears = [];
    if (yearOfAlbum <= currentYearInt - 5) {
      randomYears.push(yearOfAlbum - 7);
      randomYears.push(yearOfAlbum + 5);
    } else if (yearOfAlbum === currentYearInt) {
      randomYears.push(yearOfAlbum - 2);
      randomYears.push(yearOfAlbum - 4);
    } else {
      randomYears.push(yearOfAlbum - 3);
      randomYears.push(yearOfAlbum + 1);
    }
    const yearAnswersArray = [...randomYears, yearOfAlbum];
    const shuffledAnswers = shuffleAnswers(yearAnswersArray);
    setYearAnswersArray(shuffledAnswers);
    setAlbumAnswersArray([]);
  };

  //********QUESTION 3:******************************************//
  //********WHICH OF THEESE TRACKS APPEAR ON THIS ALBUM?********//
  //********FETCH SELECTED ALBUM DATA FROM GET_ALBUM API********//
  const getSelectedAlbumDetails = async (selectedAlbum) => {
    try {
      // Fetch the albums for the artist and country
      const { data } = await API.GET(API.ENDPOINTS.getAlbum(selectedAlbum.id));
      console.log('SELECTED ALBUM DETAILS:', data);
      // //********EXTRACT ONE TRACK FROM SELECTED ALBUM********//
      const tracklist = data.tracklist || [];

      if (tracklist.length > 0) {
        const randomIndex = Math.floor(Math.random() * tracklist.length);
        const randomTrack = tracklist[randomIndex].title;
        setRandomTrack(randomTrack);
        console.log('Randomly selected track:', randomTrack);
      } else {
        console.log('No tracks available for this album.');
      }
    } catch (error) {
      console.error('Error fetching album details:', error);
    }
  };

  // //********GET ONE TRACK FROM SELECTED ALBUM********//
  const nameTheAlbumTrackQuestion = (selectedAlbum) => {
    console.log('-- NAME THE ALBUM FROM THE TRACK QUESTION');
    const remainingAlbums = albums.filter(
      (album) => album.title.slice(-3) !== selectedAlbum.title.slice(-3)
    );

    //   //********RANDOMLY SELECTED TWO INCORRECT ANSWERS********//
    const randomIncorrectAnswers = [];
    while (randomIncorrectAnswers.length < 2) {
      const index = Math.floor(Math.random() * remainingAlbums.length);
      if (!randomIncorrectAnswers.includes(index)) {
        randomIncorrectAnswers.push(index);
      }
    }

    //   //********ENSURE THE 2 INCORRECT ANSWERS DO NOT HAVE THE SAME TITLE********//
    const incorrectAnswers = randomIncorrectAnswers.map(
      (index) => remainingAlbums[index]
    );
    if (
      incorrectAnswers[0].title.length >= 3 &&
      incorrectAnswers[1].title.length >= 3 &&
      incorrectAnswers[0].title.slice(-3) ===
      incorrectAnswers[1].title.slice(-3)
    ) {
      getRandomAlbum();
      return;
    }
    const albumTrackAnswersArray = [selectedAlbum, ...incorrectAnswers];
    console.log(albumTrackAnswersArray);
    const shuffledAnswers = shuffleAnswers(albumTrackAnswersArray);
    setAlbumTrackAnswersArray(shuffledAnswers);
    setYearAnswersArray([]);
    setAlbumAnswersArray([]);
  };

  //********CHECK IF ANSWER IS CORRECT********//
  const handleAnswerClick = (answer) => {
    if (
      answer.title === selectedAlbum.title ||
      parseInt(answer) === parseInt(selectedAlbum.year)
    ) {
      alert('Correct!');
      setQuestionAnswered(true);
    } else {
      alert('Incorrect! Try again.');
      console.log('CORRECT ANSWER', selectedAlbum.year, selectedAlbum.title);
    }
  };

  return (
    <>
      <div>
        {/*QUIZ SECTION */}
        <div>
          <h1>{artist.id}</h1>
          {!quizStarted && artistAlbumsData.length > 5 && (
            <>
              <h2>
                Fantastic! There is a quiz available to test your knowledge on{' '}
                {artist.id}:
              </h2>
              <button onClick={getRandomAlbum}>Start Quiz</button>
            </>
          )}
          {quizStarted && !albumTrackAnswersArray.length > 0 && (
            <div>
              <img
                src={selectedAlbum?.cover_image}
                alt={selectedAlbum?.title}
                style={{ cursor: 'pointer', width: '250px', height: '250px' }}
              />
            </div>
          )}
          {quizStarted && albumTrackAnswersArray.length > 0 && (
            <div>
              {incorrectAnswersArray.map((incorrectImage) => (
                <div>
                  <img
                    onClick={() => handleAnswerClick()}
                    src={selectedAlbum?.cover_image}
                    alt={selectedAlbum?.title}
                    style={{
                      cursor: 'pointer',
                      width: '250px',
                      height: '250px'
                    }}
                  />
                  <img
                    onClick={() => handleAnswerClick(incorrectImage)}
                    src={incorrectImage?.cover_image}
                    alt={incorrectImage?.title}
                    style={{
                      cursor: 'pointer',
                      width: '250px',
                      height: '250px'
                    }}
                  />
                  <img
                    onClick={() => handleAnswerClick(incorrectImage)}
                    src={incorrectImage?.cover_image}
                    alt={incorrectImage?.title}
                    style={{
                      cursor: 'pointer',
                      width: '250px',
                      height: '250px'
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          {quizStarted && albumAnswersArray.length > 0 && (
            <div>
              <h3>What is the name of this album?</h3>
              <div>
                {albumAnswersArray.map((answer, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerClick(answer)}>
                    {answer.title.replace(/^.*? - /, '').trim()}
                  </button>
                ))}
              </div>
            </div>
          )}
          {quizStarted && yearAnswersArray.length > 0 && (
            <div>
              <h3>What year was this album first released?</h3>
              <div>
                {yearAnswersArray.map((answer) => (
                  <button
                    key={answer}
                    onClick={() => handleAnswerClick(answer)}>
                    {answer}
                  </button>
                ))}
              </div>
            </div>
          )}
          {quizStarted && albumTrackAnswersArray.length > 0 && (
            <div>
              <p>{randomTrack}</p>
              <h3>This track was released on which of these albums?</h3>
              <div></div>
            </div>
          )}
          {quizStarted && questionAnswered && setNextButtonIsClicked && (
            <button onClick={getRandomAlbum}>Next Question</button>
          )}
          {quizStarted && !questionAnswered && setNextButtonIsClicked && (
            <button
              disabled={nextButtonIsClicked}
              onClick={getRandomAlbum}>
              Next Question
            </button>
          )}
        </div>
      </div>

      <div>
        {albums == null || albums.length === 0 ? (
          <p>Loading artist data...</p>
        ) : (
          <div>
            {albums.map((album) =>
              album.master_id ? (
                <div key={album.id}>
                  <img
                    onClick={() => gotoAlbum(album.id)}
                    src={album.cover_image}
                    alt={album.title}
                    style={{
                      cursor: 'pointer',
                      width: '150px',
                      height: '150px'
                    }}
                  />
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Artist;
