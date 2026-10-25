// ==========================================
// NASA APOD
// ==========================================

const apodDateInput = document.querySelector("#apod-date-input");
const todayApodBtn = document.querySelector("#today-apod-btn");
const loadDateBtn = document.querySelector("#load-date-btn");

const apodImage = document.querySelector("#apod-image");
const apodExplanation = document.querySelector("#apod-explanation");
const viewHdImageBtn = document.querySelector("#viewHdImageBtn");
const apodLoading = document.querySelector("#apod-loading");
const apodMediaType = document.querySelector("#apod-media-type");

const NASA_API_KEY = "89CghcPCKPKp667LqgmqJzPJRjjTdmpfd6kBnrHc";
const NASA_API_URL = "https://api.nasa.gov/planetary/apod";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
});

let requestId = 0;
let currentHdUrl = "";
let currentImageUrl = "";
let currentMediaType = "";
let currentTitle = "";

// Cache for NASA requests by date
const nasaCache = new Map();

function getTodayDate() {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");
}

function capitalizeFirst(text) {
    if (!text) return "";

    return text.charAt(0).toLocaleUpperCase("en-US") + text.slice(1);
}

function formatDate(date, formatter = dateFormatter) {
    const parsedDate = new Date(`${date}T12:00:00`);

    if (Number.isNaN(parsedDate.getTime())) return date;

    return capitalizeFirst(formatter.format(parsedDate));
}

function updatePageDates(date) {
    const formattedDate = formatDate(date, longDateFormatter);

    const dateElement = document.querySelector("#apod-date span");
    const detailDateElement = document.querySelector(
        "#apod-date-detail .date-value"
    );
    const infoDateElement = document.querySelector("#apod-date-info");

    if (dateElement) dateElement.textContent = formattedDate;
    if (detailDateElement) detailDateElement.textContent = formattedDate;
    if (infoDateElement) infoDateElement.textContent = formattedDate;

    if (apodDateInput?.nextElementSibling) {
        apodDateInput.nextElementSibling.textContent = formatDate(date);
    }
}

function setButtonsDisabled(disabled) {
    if (loadDateBtn) loadDateBtn.disabled = disabled;
    if (todayApodBtn) todayApodBtn.disabled = disabled;
}

function showLoading(message = "Loading today's image...") {
    if (apodLoading) {
        apodLoading.replaceChildren();

        const spinner = document.createElement("i");
        spinner.className =
            "fas fa-spinner fa-spin text-4xl text-blue-400 mb-4";

        const text = document.createElement("p");
        text.className = "text-slate-400";
        text.textContent = message;

        apodLoading.append(spinner, text);
        apodLoading.classList.remove("hidden");
        apodLoading.setAttribute("aria-busy", "true");
    }

    apodImage?.classList.add("hidden");
    setButtonsDisabled(true);

    if (viewHdImageBtn) viewHdImageBtn.disabled = true;
}

function hideLoading() {
    apodLoading?.classList.add("hidden");
    apodLoading?.setAttribute("aria-busy", "false");

    setButtonsDisabled(false);

    if (viewHdImageBtn) {
        viewHdImageBtn.disabled =
            !currentHdUrl || currentMediaType === "video";
    }
}

function showError(message) {
    if (apodLoading) {
        apodLoading.replaceChildren();

        const errorMessage = document.createElement("p");
        errorMessage.className = "text-red-400";
        errorMessage.textContent = message;

        apodLoading.appendChild(errorMessage);
        apodLoading.classList.remove("hidden");
        apodLoading.setAttribute("aria-busy", "false");
    }

    apodImage?.classList.add("hidden");

    if (viewHdImageBtn) viewHdImageBtn.disabled = true;

    setButtonsDisabled(false);
}

async function fetchNasaData(date) {
    // Return cached data if this date was already requested.
    if (nasaCache.has(date)) {
        return nasaCache.get(date);
    }

    const url = new URL(NASA_API_URL);

    url.searchParams.set("api_key", NASA_API_KEY);
    url.searchParams.set("date", date);

    const request = fetch(url)
        .then(async response => {
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error?.message ||
                    data.msg ||
                    "Unable to load NASA data. Please try again."
                );
            }

            return data;
        })
        .catch(error => {
            // Allow a retry if the request fails.
            nasaCache.delete(date);
            throw error;
        });

    nasaCache.set(date, request);

    return request;
}

function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = resolve;
        image.onerror = () => reject(
            new Error("The image could not be loaded.")
        );

        image.src = src;
    });
}

async function renderNasaData(date = getTodayDate()) {
    const today = getTodayDate();

    if (!date) {
        showError("Please select a date first.");
        return;
    }

    if (date < "1995-06-16" || date > today) {
        showError(
            `Choose a date between Jun 16, 1995 and ${formatDate(today)}.`
        );
        return;
    }

    const thisRequest = ++requestId;

    showLoading();

    try {
        const data = await fetchNasaData(date);

        if (thisRequest !== requestId) return;

        currentTitle = data.title || "";
        currentMediaType = data.media_type || "image";
        currentImageUrl = data.url || "";
        currentHdUrl = data.hdurl || data.url || "";

        if (apodExplanation) {
            apodExplanation.textContent =
                data.explanation || "No description available.";
        }

        if (apodMediaType) {
            apodMediaType.textContent = capitalizeFirst(currentMediaType);
        }

        if (apodDateInput) {
            apodDateInput.value = data.date || date;
            apodDateInput.max = today;
        }

        updatePageDates(data.date || date);

        if (currentMediaType === "video") {
            apodImage?.removeAttribute("src");
            apodImage?.classList.add("hidden");

            if (apodLoading) {
                apodLoading.replaceChildren();

                const message = document.createElement("p");
                message.className = "text-slate-400 mb-3";
                message.textContent = "This APOD is a video.";

                const link = document.createElement("a");
                link.href = currentImageUrl;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.className = "text-blue-400 underline";
                link.textContent = "Watch video";

                apodLoading.append(message, link);
                apodLoading.classList.remove("hidden");
                apodLoading.setAttribute("aria-busy", "false");
            }

            setButtonsDisabled(false);

            if (viewHdImageBtn) viewHdImageBtn.disabled = true;

            return;
        }

        if (!currentImageUrl) {
            throw new Error("No image URL was returned for this date.");
        }

        await preloadImage(currentImageUrl);

        if (thisRequest !== requestId) return;

        if (apodImage) {
            apodImage.src = currentImageUrl;
            apodImage.alt = currentTitle;
            apodImage.classList.remove("hidden");
        }

        hideLoading();
    } catch (error) {
        if (thisRequest !== requestId) return;

        console.error("NASA APOD error:", error);
        showError(error.message || "An unexpected error occurred.");
    }
}

function resetPageToInitialState() {
    requestId++;

    const today = getTodayDate();

    if (apodDateInput) {
        apodDateInput.value = today;
        apodDateInput.max = today;
    }

    currentHdUrl = "";
    currentImageUrl = "";
    currentMediaType = "";
    currentTitle = "";

    if (apodImage) {
        apodImage.removeAttribute("src");
        apodImage.alt = "";
        apodImage.classList.add("hidden");
    }

    if (apodExplanation) apodExplanation.textContent = "";
    if (apodMediaType) apodMediaType.textContent = "";

    updatePageDates(today);
    renderNasaData(today);
}

if (apodDateInput) {
    apodDateInput.max = getTodayDate();

    apodDateInput.addEventListener("change", () => {
        const selectedDate = apodDateInput.value;

        if (!selectedDate) return;

        if (apodDateInput.nextElementSibling) {
            apodDateInput.nextElementSibling.textContent =
                formatDate(selectedDate);
        }
    });
}

loadDateBtn?.addEventListener("click", () => {
    renderNasaData(apodDateInput?.value);
});

todayApodBtn?.addEventListener("click", resetPageToInitialState);

viewHdImageBtn?.addEventListener("click", () => {
    if (!currentHdUrl || currentMediaType === "video") return;

    window.open(currentHdUrl, "_blank", "noopener,noreferrer");
});

const initialDate = getTodayDate();

if (apodDateInput) {
    apodDateInput.value = initialDate;
    apodDateInput.max = initialDate;
}

updatePageDates(initialDate);


// ==========================================
// NAVIGATION
// ==========================================

const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".app-section");

navLinks.forEach(link => {
    link.addEventListener("click", function (event) {
        event.preventDefault();

        const targetSectionId = this.dataset.section;

        sections.forEach(section => {
            section.classList.toggle(
                "hidden",
                section.id !== targetSectionId
            );
        });

        navLinks.forEach(item => {
            const isActive = item === this;

            item.classList.toggle("bg-blue-500/10", isActive);
            item.classList.toggle("text-blue-400", isActive);
            item.classList.toggle("text-slate-300", !isActive);
            item.classList.toggle("hover:bg-slate-800", !isActive);
        });
    });
});


// ==========================================
// UPCOMING LAUNCHES
// ==========================================

let launchesData = [];
let launchesPromise = null;
let launchesLoaded = false;

const launchesNavLink = navLinks[1];

function getUpcomingLaunches() {
    // Do not fetch again after a successful load.
    if (launchesLoaded) {
        return Promise.resolve(launchesData);
    }

    // Reuse a request that is already in progress.
    if (launchesPromise) {
        return launchesPromise;
    }

    const url =
        "https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?limit=10&ordering=net";

    launchesPromise = fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Unable to fetch upcoming launches.");
            }

            return response.json();
        })
        .then(data => {
            launchesData = Array.isArray(data.results)
                ? data.results
                : [];

            launchesLoaded = true;

            return launchesData;
        })
        .catch(error => {
            console.error("Launch API error:", error);

            // Permit retry on the next request if the API failed.
            launchesPromise = null;

            return [];
        });

    return launchesPromise;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function initLaunchesPage() {
    displayMainLaunch();
    displayUpcomingGrid();
}

function displayMainLaunch() {
    const title = document.querySelector("#launches h3");
    const provider = document.querySelector("#spacexHeroLaunch");
    const pad = document.querySelector("#starshipLaunch");
    const dateElement = document.querySelector("#launchDate");
    const timeElement = document.querySelector("#launchTime");
    const country = document.querySelector("#country");
    const location = document.querySelector("#location");
    const description = document.querySelector("#description");
    const image = document.querySelector("#launches img");

    const launch = launchesData[0];

    if (!launch) {
        if (title) title.textContent = "No upcoming launches available.";
        return;
    }

    const launchDate = new Date(launch.net);

    const rocketDateFormatter = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    const validDate = !Number.isNaN(launchDate.getTime());

    if (title) title.textContent = launch.name || "Unknown launch";

    if (provider) {
        provider.textContent =
            launch.launch_service_provider?.name || "Unknown provider";
    }

    if (pad) {
        pad.textContent = launch.pad?.name || "Unknown pad";
    }

    if (dateElement) {
        dateElement.textContent = validDate
            ? rocketDateFormatter.format(launchDate)
            : "Date unavailable";
    }

    if (timeElement) {
        timeElement.textContent = validDate
            ? `${launchDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "UTC"
            })} UTC`
            : "Time unavailable";
    }

    if (country) {
        country.textContent = launch.pad?.country?.name || "Unknown";
    }

    if (location) {
        location.textContent = launch.pad?.location?.name || "Unknown";
    }

    if (description) {
        description.textContent =
            launch.mission?.description || "No description available.";
    }

    if (image) {
        image.src =
            launch.image?.image_url ||
            launch.image?.thumbnail_url ||
            "";

        image.alt = `Launch vehicle ${launch.name || ""}`;
    }
}

function displayUpcomingGrid() {
    const launchesGrid = document.getElementById("launches-grid");

    if (!launchesGrid) return;

    const remainingLaunches = launchesData.slice(1);

    if (remainingLaunches.length === 0) {
        launchesGrid.innerHTML =
            '<p class="text-slate-400">No additional upcoming launches found.</p>';
        return;
    }

    launchesGrid.innerHTML = remainingLaunches.map(launch => {
        const launchDate = new Date(launch.net);
        const validDate = !Number.isNaN(launchDate.getTime());

        const formattedDate = validDate
            ? launchDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            })
            : "Date unavailable";

        const formattedTime = validDate
            ? `${launchDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "UTC"
            })} UTC`
            : "Time unavailable";

        const imageUrl =
            launch.image?.thumbnail_url ||
            launch.image?.image_url ||
            "placeholder.jpg";

        return `
            <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer">
                <div class="relative h-48 bg-slate-900/50 flex items-center justify-center overflow-hidden">
                    <img
                        src="${escapeHTML(imageUrl)}"
                        alt="${escapeHTML(launch.name)}"
                        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    >
                    <div class="absolute top-3 right-3">
                        <span class="px-3 py-1 bg-slate-900/80 backdrop-blur-sm text-white rounded-full text-xs font-semibold border border-slate-700">
                            ${escapeHTML(launch.status?.abbrev || "Unknown")}
                        </span>
                    </div>
                </div>

                <div class="p-5">
                    <div class="mb-3">
                        <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors text-white">
                            ${escapeHTML(launch.name || "Unknown launch")}
                        </h4>

                        <p class="text-sm text-slate-400 flex items-center gap-2">
                            <i class="fas fa-building text-xs"></i>
                            ${escapeHTML(launch.launch_service_provider?.name || "Unknown")}
                        </p>
                    </div>

                    <div class="space-y-2 mb-4">
                        <div class="flex items-center gap-2 text-sm">
                            <i class="fas fa-calendar text-slate-500 w-4"></i>
                            <span class="text-slate-300">${formattedDate}</span>
                        </div>

                        <div class="flex items-center gap-2 text-sm">
                            <i class="fas fa-clock text-slate-500 w-4"></i>
                            <span class="text-slate-300">${formattedTime}</span>
                        </div>

                        <div class="flex items-center gap-2 text-sm">
                            <i class="fas fa-rocket text-slate-500 w-4"></i>
                            <span class="text-slate-300">
                                ${escapeHTML(launch.rocket?.configuration?.name || "Rocket unavailable")}
                            </span>
                        </div>

                        <div class="flex items-center gap-2 text-sm">
                            <i class="fas fa-map-marker-alt text-slate-500 w-4"></i>
                            <span class="text-slate-300 line-clamp-1">
                                ${escapeHTML(launch.pad?.location?.name || "Unknown location")}
                            </span>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 pt-4 border-t border-slate-700">
                        <button
                            class="flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold text-white"
                            type="button"
                        >
                            Details
                        </button>

                        <button
                            class="px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-white"
                            type="button"
                            aria-label="Add to favorites"
                        >
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

if (launchesNavLink) {
    launchesNavLink.addEventListener("click", async () => {
        await getUpcomingLaunches();
        initLaunchesPage();
    });
}


// ==========================================
// PLANETS
// ==========================================

const planetsGrid = document.getElementById("planets-grid");

let planetsData = [];
let planetsPromise = null;
let planetsLoaded = false;

const mainPlanets = [
    "Mercury",
    "Venus",
    "Earth",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune"
];

const planetColors = {
    mercury: "#eab308",
    venus: "#f97316",
    earth: "#3b82f6",
    mars: "#ef4444",
    jupiter: "#fb923c",
    saturn: "#facc15",
    uranus: "#06b6d4",
    neptune: "#2563eb"
};

function formatNumber(value, digits = 2) {
    if (
        value == null ||
        value === "" ||
        !Number.isFinite(Number(value))
    ) {
        return "N/A";
    }

    return Number(value).toLocaleString("en-US", {
        maximumFractionDigits: digits
    });
}

function formatMass(mass) {
    if (
        !mass ||
        mass.massValue == null ||
        mass.massExponent == null
    ) {
        return "N/A";
    }

    return `${mass.massValue} × 10^${mass.massExponent} kg`;
}

function formatVolume(volume) {
    if (
        !volume ||
        volume.volValue == null ||
        volume.volExponent == null
    ) {
        return "N/A";
    }

    return `${volume.volValue} × 10^${volume.volExponent} km³`;
}

function formatDistance(km) {
    if (km == null || !Number.isFinite(Number(km))) {
        return "N/A";
    }

    return `${formatNumber(Number(km) / 1_000_000, 1)}M km`;
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value ?? "N/A";
    }
}

function getUpcomingPlanets() {
    // Reuse the same request instead of fetching repeatedly.
    if (planetsPromise) {
        return planetsPromise;
    }

    const url =
        "https://solar-system-opendata-proxy.vercel.app/api/planets";

    planetsPromise = fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Unable to fetch planet data.");
            }

            return response.json();
        })
        .then(data => {
            const bodies = Array.isArray(data.bodies)
                ? data.bodies
                : [];

            if (bodies.length === 0) {
                throw new Error("No planet data was returned.");
            }

            return bodies;
        })
        .catch(error => {
            console.error("Planets API error:", error);

            // Allow another attempt if the request fails.
            planetsPromise = null;

            return [];
        });

    return planetsPromise;
}

async function loadPlanets() {
    if (!planetsGrid) return;

    // Data is already loaded; no need to fetch it again.
    if (planetsLoaded) {
        return;
    }

    planetsGrid.innerHTML =
        '<p class="text-slate-400">Loading planets...</p>';

    const data = await getUpcomingPlanets();

    planetsData = data.filter(planet =>
        mainPlanets.includes(planet.englishName)
    );

    if (planetsData.length === 0) {
        planetsGrid.innerHTML =
            '<p class="text-red-400">Unable to load planets. Please try again.</p>';

        updatePlanetComparison([]);
        return;
    }

    planetsGrid.replaceChildren();

    planetsData.forEach(planet => {
        const planetId = planet.englishName.toLowerCase();
        const color = planetColors[planetId] || "#3b82f6";

        const card = document.createElement("div");
        card.className =
            "planet-card bg-slate-800/50 border border-slate-700 rounded-2xl p-4 transition-all cursor-pointer group";

        card.dataset.planetId = planetId;
        card.style.setProperty("--planet-color", color);

        const image = document.createElement("img");
        image.className =
            "w-20 h-20 object-contain group-hover:scale-110 transition-transform";

        image.src = `./assets/images/${planetId}.png`;
        image.alt = planet.englishName;

        image.onerror = function () {
            this.style.visibility = "hidden";
        };

        const imageContainer = document.createElement("div");
        imageContainer.className =
            "relative mb-3 h-24 flex items-center justify-center";

        imageContainer.appendChild(image);

        const name = document.createElement("h4");
        name.className = "font-semibold text-center text-sm";
        name.textContent = planet.englishName;

        const distance = document.createElement("p");
        distance.className = "text-xs text-slate-400 text-center";

        distance.textContent = planet.semimajorAxis == null
            ? "N/A"
            : `${formatNumber(planet.semimajorAxis / 149597870.7)} AU`;

        card.append(imageContainer, name, distance);

        card.addEventListener("click", () => {
            showPlanetDetails(planet);
        });

        planetsGrid.appendChild(card);
    });

    updatePlanetComparison(planetsData);

    const earth = planetsData.find(
        planet => planet.englishName === "Earth"
    );

    showPlanetDetails(earth || planetsData[0]);

    planetsLoaded = true;
}

function showPlanetDetails(planet) {
    if (!planet) return;

    const moonsCount = Array.isArray(planet.moons)
        ? planet.moons.length
        : planet.moons == null
            ? 0
            : "N/A";

    setText("planet-detail-name", planet.englishName);

    setText(
        "planet-detail-description",
        planet.description || "No description available."
    );

    setText(
        "planet-distance",
        planet.semimajorAxis == null
            ? "N/A"
            : `${formatNumber(planet.semimajorAxis / 1_000_000, 1)}M km`
    );

    setText(
        "planet-radius",
        planet.meanRadius == null
            ? "N/A"
            : `${formatNumber(planet.meanRadius, 0)} km`
    );

    setText("planet-mass", formatMass(planet.mass));

    setText(
        "planet-density",
        planet.density == null
            ? "N/A"
            : `${formatNumber(planet.density, 4)} g/cm³`
    );

    setText(
        "planet-orbital-period",
        planet.sideralOrbit == null
            ? "N/A"
            : `${formatNumber(planet.sideralOrbit)} days`
    );

    setText(
        "planet-rotation",
        planet.sideralRotation == null
            ? "N/A"
            : `${formatNumber(Math.abs(planet.sideralRotation))} hours`
    );

    setText("planet-moons", moonsCount);

    setText(
        "planet-gravity",
        planet.gravity == null
            ? "N/A"
            : `${formatNumber(planet.gravity)} m/s²`
    );

    setText("planet-discoverer", planet.discoveredBy || "Unknown");

    setText(
        "planet-discovery-date",
        planet.discoveryDate || "Ancient times"
    );

    setText("planet-body-type", planet.bodyType || "Planet");
    setText("planet-volume", formatVolume(planet.vol));

    setText("planet-perihelion", formatDistance(planet.perihelion));
    setText("planet-aphelion", formatDistance(planet.aphelion));
    setText("planet-eccentricity", formatNumber(planet.eccentricity, 5));

    setText(
        "planet-inclination",
        planet.inclination == null
            ? "N/A"
            : `${formatNumber(planet.inclination)}°`
    );

    setText(
        "planet-axial-tilt",
        planet.axialTilt == null
            ? "N/A"
            : `${formatNumber(planet.axialTilt)}°`
    );

    setText(
        "planet-temp",
        planet.avgTemp == null
            ? "N/A"
            : `${formatNumber(planet.avgTemp - 273.15)}°C`
    );

    setText(
        "planet-escape",
        planet.escape == null
            ? "N/A"
            : `${formatNumber(planet.escape / 1000)} km/s`
    );

    const image = document.getElementById("planet-detail-image");

    if (image) {
        image.src =
            `./assets/images/${planet.englishName.toLowerCase()}.png`;

        image.alt = planet.englishName;

        image.onerror = function () {
            this.style.visibility = "hidden";
        };

        image.onload = function () {
            this.style.visibility = "visible";
        };
    }

    const facts = document.getElementById("planet-facts");

    if (facts) {
        facts.replaceChildren();

        const factItems = [
            `Mass: ${formatMass(planet.mass)}`,

            `Surface gravity: ${
                planet.gravity == null
                    ? "N/A"
                    : `${formatNumber(planet.gravity)} m/s²`
            }`,

            `Density: ${
                planet.density == null
                    ? "N/A"
                    : `${formatNumber(planet.density, 4)} g/cm³`
            }`,

            `Axial tilt: ${
                planet.axialTilt == null
                    ? "N/A"
                    : `${formatNumber(planet.axialTilt)}°`
            }`
        ];

        factItems.forEach(text => {
            const item = document.createElement("li");
            item.textContent = text;
            facts.appendChild(item);
        });
    }
}

function updatePlanetComparison(data) {
    const tbody = document.getElementById("planet-comparison-tbody");

    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-4 text-center text-slate-400">
                    Planet comparison data is unavailable.
                </td>
            </tr>
        `;

        return;
    }

    const typeStyles = {
        Terrestrial: "bg-orange-500/50 text-orange-200",
        "Gas Giant": "bg-purple-500/50 text-purple-200",
        "Ice Giant": "bg-cyan-500/50 text-cyan-200"
    };

    const earthMassKg = 5.9722e24;

    function getMassInEarthUnits(mass) {
        if (
            !mass ||
            mass.massValue == null ||
            mass.massExponent == null
        ) {
            return "N/A";
        }

        const massKg =
            Number(mass.massValue) *
            Math.pow(10, Number(mass.massExponent));

        return formatNumber(massKg / earthMassKg, 3);
    }

    function getPlanetType(planet) {
        const name = planet.englishName;

        if (["Mercury", "Venus", "Earth", "Mars"].includes(name)) {
            return "Terrestrial";
        }

        if (["Jupiter", "Saturn"].includes(name)) {
            return "Gas Giant";
        }

        if (["Uranus", "Neptune"].includes(name)) {
            return "Ice Giant";
        }

        return planet.bodyType || "Unknown";
    }

    const planets = mainPlanets
        .map(name => data.find(planet => planet.englishName === name))
        .filter(Boolean);

    tbody.innerHTML = planets.map(planet => {
        const planetId = planet.englishName.toLowerCase();
        const color = planetColors[planetId] || "#3b82f6";
        const type = getPlanetType(planet);

        const typeClass =
            typeStyles[type] || "bg-slate-500/50 text-slate-200";

        const distanceAU = planet.semimajorAxis == null
            ? "N/A"
            : formatNumber(planet.semimajorAxis / 149597870.7);

        const diameter = planet.meanRadius == null
            ? "N/A"
            : formatNumber(planet.meanRadius * 2, 0);

        const mass = getMassInEarthUnits(planet.mass);
        const days = Number(planet.sideralOrbit);

        const orbitalPeriod =
            planet.sideralOrbit == null || !Number.isFinite(days)
                ? "N/A"
                : days >= 365
                    ? `${formatNumber(days / 365.25, 1)} years`
                    : `${formatNumber(days, 1)} days`;

        const moons = Array.isArray(planet.moons)
            ? planet.moons.length
            : "N/A";

        return `
            <tr class="hover:bg-slate-800/30 transition-colors ${
                planet.englishName === "Earth" ? "bg-blue-500/5" : ""
            }">
                <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
                    <div class="flex items-center space-x-2 md:space-x-3">
                        <div
                            class="w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0"
                            style="background-color: ${color}"
                        ></div>

                        <span class="font-semibold text-sm md:text-base whitespace-nowrap">
                            ${escapeHTML(planet.englishName)}
                        </span>
                    </div>
                </td>

                <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">
                    ${distanceAU}
                </td>

                <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">
                    ${diameter}
                </td>

                <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">
                    ${mass}
                </td>

                <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">
                    ${orbitalPeriod}
                </td>

                <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">
                    ${moons}
                </td>

                <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                    <span class="px-2 py-1 rounded text-xs ${typeClass}">
                        ${escapeHTML(type)}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}


// ==========================================
// INITIALIZE PLANETS NAVIGATION
// ==========================================

const planetsNavLink = navLinks[2];

if (planetsNavLink) {
    planetsNavLink.addEventListener("click", loadPlanets);
}


// ==========================================
// START ALL API REQUESTS ON PAGE LOAD
// ==========================================

// NASA starts loading through renderNasaData().
// Launches and planets start loading in parallel.
// The sections themselves remain hidden until clicked.

Promise.allSettled([
    renderNasaData(initialDate),

    getUpcomingLaunches().then(() => {
        initLaunchesPage();
    }),

    loadPlanets()
]);