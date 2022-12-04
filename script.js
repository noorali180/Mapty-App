'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const mapContiner = document.querySelector('#map');

/// WORKOUT CLASS... 
class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    description;

    constructor(coords, distance, duration){
        this.coords = coords; // [lat, lng]
        this.distance = distance; // km
        this.duration = duration; // min
    }

    _setDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${months[+this.date.getMonth()]} ${this.date.getDate()}`
    }
}

/// RUNNING CLASS... 
class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.cadence = cadence;
        this.pace = this._calcPace();
        this._setDescription();
    }

    _calcPace(){
        return this.duration / this.distance;
    }

}

/// CYCLING CLASS... 
class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevation){
        super(coords, distance, duration);
        this.elevation = elevation;
        this.speed = this._calcSpeed();
        this._setDescription();
    }

    _calcSpeed(){
        return this.distance / (this.duration / 60);
    }
}


/////////////// APP Architecture... 
class App{
    #map;
    #mapEvent;
    #workouts = [];

    constructor(){
        this._getPosition();

        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField.bind(this));
    }

    _setLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage(){
        if(!localStorage.getItem('workouts')) return;

        this.#workouts = JSON.parse(localStorage.getItem('workouts'));
    }

    _getPosition(){
        navigator.geolocation.getCurrentPosition(
            this._loadMap.bind(this), 
            function() {
                alert("Could'nt get the location.");
            });
    }

    _loadMap(position){
        const {latitude, longitude} = position.coords;

        this.#map = L.map('map').setView([latitude, longitude], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
        .addTo(this.#map);
        
        // handling clicks on map...
        this.#map.on('click', this._showForm.bind(this));

        // Initializes the initial conditions of the app...
        this._init();
    }

    _showForm(mapE){
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm(){
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

        form.style.display = 'none';
        form.classList.add('hidden');

        setTimeout(()=>form.style.display = 'grid', 1000);
    }

    _toggleElevationField(){
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e){
        e.preventDefault();

        const valid = (...inputs) => inputs.every((inp) => Number.isFinite(inp) && inp !== '');
        const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

        // get data from form.
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        const coords = [lat, lng];
        let workout;

        // if type is running create running object
        if(type === 'running'){
            const cadence = +inputCadence.value;

            // validate inputs.
            if(!valid(distance, duration, cadence)) return alert('Input should be positive integer.');

            if(!allPositive(distance, duration, cadence)) return alert('Input should be positive integer.');

            // create object
            workout = new Running(coords, distance, duration, cadence);
        }

        // if type is cycling create cycling object
        if(type === 'cycling'){
            const elevation = +inputElevation.value;

            // validate inputs.
            if(!valid(distance, duration, elevation)) return alert('Input should be positive integer.');

            if(!allPositive(distance, duration)) return alert('Input should be positive integer.');

            // create object
            workout = new Cycling(coords, distance, duration, elevation);
        }

        // render workout marker on map
        this._renderWorkoutMarker(workout);

        // add workout in list
        this.#workouts.push(workout);
        this._renderWorkout(workout);

        // add workout in localStorage...
        this._setLocalStorage();

        // Empty the form fields + hide the form...
                this._hideForm();
    }
    
    _renderWorkoutMarker(workout){
        L.marker(workout.coords).addTo(this.#map)
        .bindPopup(
            L.popup({
                maxWidth: 250,
                maxHeight: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            })
        )
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️' } ${workout.description}`)
        .openPopup();
    }

    _renderWorkout(workout){
        let html = `
        <li class="workout workout--${workout.type}" data-id=${workout.id}>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;

        if(workout.type === 'running'){
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.pace.toFixed(2)}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
            `;
        }

        if(workout.type === 'cycling'){
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.speed.toFixed(2)}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
            `
        }

        form.insertAdjacentHTML('afterend', html);
    }

    _init(){
        this._getLocalStorage();

        if(this.#workouts.length === 0) return;

        this.#workouts.forEach((workout) => {
            this._renderWorkout(workout);
            this._renderWorkoutMarker(workout);
        })
    }
}

// navigator.geolocation.getCurrentPosition((position)=> {
//     const {latitude, longitude} = position.coords;

//     var map = L.map('map').setView([latitude, longitude], 13);

// L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
//     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
// }).addTo(map);

// map.on('click', function(e){
//     const {lat, lng} = e.latlng;

//     L.marker([lat, lng]).addTo(map)
//     .bindPopup(
//         L.popup({
//             maxWidth: 250,
//             maxHeight: 100,
//             autoClose: false,
//             closeOnClick: false,
//             className: 'running-popup'
//         })
//     )
//     .setPopupContent('Workout')
//     .openPopup();
// })


// }, 
// ()=> console.log('failed'));

const app = new App();
