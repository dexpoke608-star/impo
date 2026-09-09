const WORD_BANK = {
  food: [
    "Pizza", "Sushi", "Burger", "Pasta", "Tacos", "Pancakes", "Ice Cream",
    "Popcorn", "Chocolate", "Sandwich", "Curry", "Noodles", "Cheese",
    "Donut", "Waffles", "Biryani", "Samosa", "Momos", "Pretzel", "Ramen",
  ],
  animals: [
    "Elephant", "Penguin", "Kangaroo", "Dolphin", "Tiger", "Octopus",
    "Giraffe", "Panda", "Flamingo", "Koala", "Cheetah", "Owl", "Peacock",
    "Chameleon", "Hedgehog", "Otter", "Sloth", "Parrot", "Camel", "Fox",
  ],
  movies: [
    "Titanic", "Inception", "Avatar", "Jaws", "Frozen", "Gladiator",
    "The Matrix", "Jurassic Park", "The Lion King", "Shrek", "Avengers",
    "Batman", "Spider-Man", "Toy Story", "Interstellar", "Rocky",
    "Home Alone", "Finding Nemo", "The Godfather", "Star Wars",
  ],
  sports: [
    "Cricket", "Football", "Basketball", "Tennis", "Badminton", "Boxing",
    "Swimming", "Golf", "Volleyball", "Hockey", "Rugby", "Cycling",
    "Wrestling", "Archery", "Skiing", "Surfing", "Bowling", "Chess",
    "Table Tennis", "Marathon",
  ],
  places: [
    "Beach", "Airport", "Hospital", "Library", "Museum", "Stadium",
    "Mountain", "Desert", "Zoo", "Castle", "Waterfall", "Volcano",
    "Amusement Park", "Lighthouse", "Temple", "Forest", "Island",
    "Subway Station", "Cinema", "Bakery",
  ],
  objects: [
    "Umbrella", "Backpack", "Telescope", "Guitar", "Camera", "Bicycle",
    "Candle", "Mirror", "Suitcase", "Headphones", "Wallet", "Ladder",
    "Compass", "Lantern", "Typewriter", "Skateboard", "Binoculars",
    "Kite", "Hammer", "Sunglasses",
  ],
  professions: [
    "Doctor", "Chef", "Astronaut", "Firefighter", "Pilot", "Teacher",
    "Detective", "Photographer", "Architect", "Magician", "Farmer",
    "Lifeguard", "Plumber", "Journalist", "Dentist", "Scientist",
    "Electrician", "Tailor", "Librarian", "Barista",
  ],
};

const CATEGORY_LABELS = {
  food: "Food",
  animals: "Animals",
  movies: "Movies",
  sports: "Sports",
  places: "Places",
  objects: "Everyday Objects",
  professions: "Professions",
  random: "Random Mix",
};

function allCategories() {
  return Object.keys(WORD_BANK);
}

function categoryList() {
  return [...allCategories(), "random"].map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
  }));
}

/** Picks a word for the given category (or a random category if "random"),
 * avoiding words already used this session where possible. */
function pickWord(category, usedWords) {
  const pool = category === "random" ? allCategories() : [category];
  const chosenCategory = pool[Math.floor(Math.random() * pool.length)];
  const words = WORD_BANK[chosenCategory];
  const used = usedWords[chosenCategory] || new Set();

  let available = words.filter((w) => !used.has(w));
  if (available.length === 0) {
    used.clear();
    available = words;
  }

  const word = available[Math.floor(Math.random() * available.length)];
  used.add(word);
  usedWords[chosenCategory] = used;

  return { word, category: chosenCategory };
}

module.exports = { WORD_BANK, CATEGORY_LABELS, allCategories, categoryList, pickWord };
