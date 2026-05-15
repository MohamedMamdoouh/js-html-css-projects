const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FC_URL = "https://api.open-meteo.com/v1/forecast";

const UI = {
  city: document.getElementById("city"),
  btnSearch: document.getElementById("btnSearch"),
  btnUseCairo: document.getElementById("btnUseCairo"),

  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  results: document.getElementById("results"),

  placeName: document.getElementById("placeName"),
  placeMeta: document.getElementById("placeMeta"),
  tempNow: document.getElementById("tempNow"),
  humidityPill: document.getElementById("humidityPill"),
  windPill: document.getElementById("windPill"),
  timeMeta: document.getElementById("timeMeta"),
  weatherCondition: document.getElementById("weatherConditionPill"),

  forecastBody: document.getElementById("forecastBody"),
};

let currentController = null;

function setLoading(isLoading) {
  if (isLoading) {
    UI.loading.classList.remove("hidden");
    UI.loading.classList.add("flex");
  } else {
    UI.loading.classList.remove("flex");
    UI.loading.classList.add("hidden");
  }
  UI.btnSearch.disabled = isLoading;
  UI.btnUseCairo.disabled = isLoading;
}

function setError(message) {
  if (!message) {
    UI.error.classList.remove("visible");
    UI.error.classList.add("hidden");
    UI.error.textContent = "";
    return;
  }

  UI.error.classList.remove("hidden");
  UI.error.classList.add("visible");
  UI.error.textContent = message;
}

async function apiFetchJson(url, signal) {
  const res = await fetch(url, { signal });

  if (!res.ok) throw new Error(`HTTP ${res.status} (${res.statusText})`);

  return res.json();
}

async function geocodeCity(name, signal) {
  const url = new URL(GEO_URL);

  // According to Open-Meteo docs, these params are needed
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const data = await apiFetchJson(url, signal);

  if (!data.results || data.results.length === 0) {
    throw new Error(`City not found: ${name}`);
  }

  return data.results[0];
}

async function getForecast(lat, lon, signal) {
  const url = new URL(FC_URL);

  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_min,temperature_2m_max,precipitation_sum,weather_code",
  );
  url.searchParams.set("timezone", "auto");

  return apiFetchJson(url, signal);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getWeatherDescription(code) {
  const weatherMap = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
  };

  return weatherMap[code] || "N/A";
}

function render(place, data) {
  UI.results.classList.remove("hidden");
  UI.placeName.textContent = `${place.name}, ${place.country}`;
  UI.placeMeta.textContent = `Lat/Lon: ${place.latitude}, ${place.longitude}`;

  UI.tempNow.textContent = `${data.current.temperature_2m}${data.current_units.temperature_2m}`;
  UI.humidityPill.textContent = `Humidity: ${data.current.relative_humidity_2m}${data.current_units.relative_humidity_2m}`;
  UI.windPill.textContent = `Wind: ${data.current.wind_speed_10m} ${data.current_units.wind_speed_10m}`;
  UI.timeMeta.textContent = `Local time: ${formatDate(data.current.time)} (${data.timezone})`;
  UI.weatherCondition.textContent = `Condition: ${getWeatherDescription(data.current.weather_code)}`;
  const days = data.daily.time;

  UI.forecastBody.innerHTML = days
    .map((day, i) => {
      const min = data.daily.temperature_2m_min[i];
      const max = data.daily.temperature_2m_max[i];
      const rain = data.daily.precipitation_sum[i];
      const condition = getWeatherDescription(data.daily.weather_code[i]);

      const minU = data.daily_units.temperature_2m_min;
      const maxU = data.daily_units.temperature_2m_max;
      const rainU = data.daily_units.precipitation_sum;

      return `
          <tr>
            <td>${day}</td>
            <td>${min}${minU}</td>
            <td>${max}${maxU}</td>
            <td>${rain} ${rainU}</td>
            <td>${condition}</td>
          </tr>
        `;
    })
    .join("");
}

async function runSearch(cityName) {
  if (currentController) currentController.abort();

  currentController = new AbortController();

  setError("");
  setLoading(true);

  try {
    const place = await geocodeCity(cityName, currentController.signal);
    const data = await getForecast(
      place.latitude,
      place.longitude,
      currentController.signal,
    );

    render(place, data);
  } catch (err) {
    if (err.name === "AbortError") return;
    setError(`❌ ${err.message}`);
    UI.results.classList.add("hidden");
  } finally {
    setLoading(false);
  }
}

UI.btnSearch.addEventListener("click", () => {
  const name = UI.city.value.trim();

  const cityRegex =
    /^(?!^[\s\-.'\u0080-\u024F]+$)[a-zA-Z\u0080-\u024F\s\-.']+$/;
  if (!cityRegex.test(name) || name.length === 0) {
    setError("❌ Please enter a valid city name.");
    return;
  }

  runSearch(name);
});

UI.city.addEventListener("keydown", (e) => {
  if (e.key === "Enter") UI.btnSearch.click();
});

UI.btnUseCairo.addEventListener("click", () => {
  UI.city.value = "Cairo";
  runSearch("Cairo");
});

UI.city.value = "Cairo";
runSearch("Cairo");
