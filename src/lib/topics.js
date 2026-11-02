// Curated Topics & Imposter Clues Catalog

export const TOPIC_CATEGORIES = [
  {
    category: "Food & Treats",
    topics: [
      { topic: "PIZZA", clue: "ITALIAN" },
      { topic: "SUSHI", clue: "RAW FISH" },
      { topic: "PANCAKES", clue: "MAPLE SYRUP" },
      { topic: "TACOS", clue: "MEXICAN STREET FOOD" },
      { topic: "ICE CREAM", clue: "FREEZER DESSERT" },
      { topic: "BUBBLE TEA", clue: "TAPIOCA PEARLS" },
      { topic: "BURGER", clue: "SESAME BUN" },
      { topic: "DONUT", clue: "HOLE IN THE MIDDLE" },
      { topic: "CHOCOLATE FONDUE", clue: "MELTED SWEET" },
      { topic: "GUACAMOLE", clue: "AVOCADO DIP" }
    ]
  },
  {
    category: "Pop Culture & Gaming",
    topics: [
      { topic: "MINECRAFT", clue: "BLOCKS AND CRAFTING" },
      { topic: "HARRY POTTER", clue: "HOGWARTS WIZARD" },
      { topic: "SPIDER-MAN", clue: "SPIDER WEB SHOOTER" },
      { topic: "SUPER MARIO", clue: "RED CAP & MUSHROOMS" },
      { topic: "POKEMON PIKACHU", clue: "YELLOW ELECTRIC THUNDER" },
      { topic: "STAR WARS", clue: "LIGHTSABER FORCE" },
      { topic: "BATMAN", clue: "GOTHAM KNIGHT" },
      { topic: "BARBIE", clue: "PINK DREAMHOUSE" },
      { topic: "STRANGER THINGS", clue: "THE UPSIDE DOWN" },
      { topic: "AVENGERS", clue: "SUPERHERO ASSEMBLE" }
    ]
  },
  {
    category: "Everyday Objects",
    topics: [
      { topic: "TOOTHBRUSH", clue: "BATHROOM SINK" },
      { topic: "SUNGLASSES", clue: "BRIGHT SUNSHINE" },
      { topic: "UMBRELLA", clue: "RAINY WEATHER" },
      { topic: "MICROWAVE", clue: "KITCHEN REHEATER" },
      { topic: "SMARTPHONE", clue: "TOUCHSCREEN POCKET" },
      { topic: "HEADPHONES", clue: "AUDIO LISTENING" },
      { topic: "BACKPACK", clue: "SCHOOL STRAPS" },
      { topic: "PILLOW", clue: "BEDROOM SLEEP" },
      { topic: "SCISSORS", clue: "CUTTING TOOL" },
      { topic: "FLASHLIGHT", clue: "DARKNESS BEAM" }
    ]
  },
  {
    category: "Animals & Nature",
    topics: [
      { topic: "PENGUIN", clue: "ANTARCTICA TUXEDO" },
      { topic: "KANGAROO", clue: "AUSTRALIAN POUCH" },
      { topic: "CHAMELEON", clue: "COLOR CHANGING" },
      { topic: "GREAT WHITE SHARK", clue: "OCEAN PREDATOR FIN" },
      { topic: "SLOTH", clue: "SLOW TREE CLIMBER" },
      { topic: "ELEPHANT", clue: "LONG NOSE TRUNK" },
      { topic: "GIRAFFE", clue: "TALL LONG NECK" },
      { topic: "DOLPHIN", clue: "PLAYFUL OCEAN BLOWHOLE" },
      { topic: "VOLCANO", clue: "FLOWING RED LAVA" },
      { topic: "RAINBOW", clue: "SEVEN SKY COLORS" }
    ]
  },
  {
    category: "Places & Travel",
    topics: [
      { topic: "EIFFEL TOWER", clue: "PARIS LANDMARK" },
      { topic: "PYRAMIDS OF GIZA", clue: "EGYPTIAN PHARAOHS" },
      { topic: "DISNEY WORLD", clue: "FAIRYTALE CASTLE" },
      { topic: "MOUNT EVEREST", clue: "HIGHEST PEAK" },
      { topic: "SPACE STATION", clue: "FLOATING IN ORBIT" },
      { topic: "HOLLYWOOD", clue: "RED CARPET STARS" },
      { topic: "TAJ MAHAL", clue: "MARBLE MONUMENT" },
      { topic: "GRAND CANYON", clue: "RED ROCK GORGE" }
    ]
  },
  {
    category: "Roles & Fantasy",
    topics: [
      { topic: "ASTRONAUT", clue: "SPACESUIT MOONWALK" },
      { topic: "SECRET AGENT", clue: "UNDERCOVER SPY GADGET" },
      { topic: "DETECTIVE", clue: "MAGNIFYING GLASS" },
      { topic: "PIRATE CAPTAIN", clue: "TREASURE CHEST SHIP" },
      { topic: "MAGICIAN", clue: "RABBIT IN A HAT" },
      { topic: "DRAGON", clue: "FIRE BREATHING MYTH" },
      { topic: "TIME MACHINE", clue: "TRAVELING TO THE PAST" },
      { topic: "VAMPIRE", clue: "SHARP FANGS & GARLIC" }
    ]
  }
];

// Helper to pick random topic and clue
export function getRandomTopic(selectedCategory = 'all') {
  let eligible = TOPIC_CATEGORIES;
  if (selectedCategory && selectedCategory !== 'all') {
    eligible = TOPIC_CATEGORIES.filter(c => c.category.toLowerCase() === selectedCategory.toLowerCase());
  }
  if (eligible.length === 0) eligible = TOPIC_CATEGORIES;

  const cat = eligible[Math.floor(Math.random() * eligible.length)];
  const item = cat.topics[Math.floor(Math.random() * cat.topics.length)];

  return {
    category: cat.category,
    topic: item.topic,
    clue: item.clue
  };
}
