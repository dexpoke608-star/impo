// Each entry is either a plain string, or { word, wiki } when the display
// word doesn't match the Wikipedia article title we want an image from
// (e.g. disambiguation against a same-named place/venue).
const WORD_BANK = {
  food: [
    "Ceviche", "Baklava", "Escargot", "Goulash", "Poutine", "Shakshuka",
    "Falafel", "Tiramisu", "Paella", "Ratatouille", "Bruschetta", "Kimchi",
    "Pho", "Gyoza", "Churros", "Tamales", "Risotto", "Foie Gras",
    "Croque Monsieur", "Beef Wellington", "Biryani", "Baingan Bharta",
  ],
  animals: [
    "Axolotl", "Pangolin", "Platypus", "Narwhal", "Tapir", "Okapi",
    "Quokka", "Capybara", "Aardvark", "Wolverine", "Mongoose", "Manatee",
    "Vulture", "Komodo Dragon", "Anglerfish", "Binturong", "Fennec Fox",
    "Wombat", "Tarsier", "Dugong",
  ],
  movies: [
    "Pulp Fiction", "Fight Club", "The Godfather", "Se7en", "American Psycho",
    "The Wolf of Wall Street", "No Country for Old Men", "Requiem for a Dream",
    "A Clockwork Orange", "Reservoir Dogs", "Goodfellas", "The Departed",
    { word: "Casino", wiki: "Casino (1995 film)" },
    "Scarface", "The Shining", "Basic Instinct", "Deadpool", "Kill Bill",
    "Joker", "Parasite",
  ],
  sports: [
    "Curling", "Fencing", "Water Polo", "Sumo Wrestling", "Biathlon",
    "Snooker", "Darts", "Lacrosse", "Squash", "Bobsleigh", "Triathlon",
    "Pole Vault", "Synchronized Swimming", "Ultimate Frisbee", "Polo",
    "Handball", "Rowing", "Speed Skating", "Motocross", "Sepak Takraw",
  ],
  places: [
    "Chernobyl", "Area 51", "The Vatican", "Machu Picchu", "Petra",
    "Stonehenge", "Angkor Wat", "Bermuda Triangle", "Alcatraz",
    "Amazon Rainforest", "Great Barrier Reef", "Antarctica", "Sahara Desert",
    "Death Valley", "The Dead Sea", "Mount Everest", "Grand Canyon",
    "Niagara Falls", "Eiffel Tower", "Las Vegas Strip",
  ],
  objects: [
    "Rubik's Cube", "Metronome", "Abacus", "Sundial", "Kaleidoscope",
    "Monocle", "Gramophone", "Fountain Pen", "Pocket Watch",
    "Magnifying Glass", "Tuning Fork", "Weathervane", "Hourglass",
    "Divining Rod", "Ouija Board", "Straitjacket", "Handcuffs",
    "Breathalyzer", "Lie Detector",
  ],
  professions: [
    "Cryptographer", "Sommelier", "Taxidermist", "Locksmith", "Embalmer",
    "Bounty Hunter", "Bodyguard", "Diplomat", "Forensic Scientist",
    "Hostage Negotiator", "Stuntman", "Ghostwriter", "Puppeteer",
    "Cartographer", "Beekeeper", "Actuary", "Falconer", "Interpreter",
  ],
  celebrities: [
    "Dwayne Johnson", "Taylor Swift", "Elon Musk", "Cristiano Ronaldo",
    "Lionel Messi", "Kim Kardashian", "Leonardo DiCaprio", "Rihanna",
    "Barack Obama", "Beyoncé", "Tom Cruise", "Oprah Winfrey", "Kanye West",
    "Zendaya", "Keanu Reeves", "Drake", "Serena Williams",
    "Priyanka Chopra", "Shah Rukh Khan", "Virat Kohli",
  ],
  after_dark: [
    "Hangover", "Bachelor Party", "Bachelorette Party", "Blind Date",
    "Divorce", "Prenup", "One-Night Stand", "Sugar Daddy", "Tinder Date",
    "Midlife Crisis", "Open Relationship", "Alimony", "Speed Dating",
    "Walk of Shame", "Credit Card Debt", "Cougar", "Friends With Benefits",
    "Nightclub", "Casino Night", "Karaoke Bar", "Speakeasy", "Rooftop Bar",
    "Wine Tasting", "Rave", "Beer Pong", "Hookah Lounge", "Poker Night",
    "Strip Club",
  ],
};

const ADULT_CATEGORIES = new Set(["after_dark"]);

const CATEGORY_LABELS = {
  food: "Food",
  animals: "Animals",
  movies: "Movies",
  sports: "Sports",
  places: "Places",
  objects: "Objects",
  professions: "Professions",
  celebrities: "Celebrities",
  after_dark: "After Dark (18+)",
  random: "Random Mix",
};

function allCategories() {
  return Object.keys(WORD_BANK);
}

function categoryList() {
  return [...allCategories(), "random"].map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
    adult: ADULT_CATEGORIES.has(id),
  }));
}

function normalizeEntry(entry) {
  return typeof entry === "string" ? { word: entry, wiki: entry } : { word: entry.word, wiki: entry.wiki || entry.word };
}

/** Picks a word for the given category (or a random category if "random"),
 * avoiding words already used this session where possible. Returns the
 * display word plus the Wikipedia title to use for its image lookup. */
function pickWord(category, usedWords) {
  const pool = category === "random" ? allCategories() : [category];
  const chosenCategory = pool[Math.floor(Math.random() * pool.length)];
  const entries = WORD_BANK[chosenCategory];
  const used = usedWords[chosenCategory] || new Set();

  let available = entries.filter((e) => !used.has(normalizeEntry(e).word));
  if (available.length === 0) {
    used.clear();
    available = entries;
  }

  const { word, wiki } = normalizeEntry(available[Math.floor(Math.random() * available.length)]);
  used.add(word);
  usedWords[chosenCategory] = used;

  return { word, wiki, category: chosenCategory };
}

module.exports = { WORD_BANK, CATEGORY_LABELS, ADULT_CATEGORIES, allCategories, categoryList, pickWord };
