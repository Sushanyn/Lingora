export const wordsByLevel: Record<string, string[]> = {
  A1: [
    "hello", "goodbye", "please", "thank you", "yes", "no", "man", "woman", "boy", "girl",
    "water", "food", "house", "car", "dog", "cat", "friend", "family", "time", "day",
    "night", "sun", "moon", "book", "school", "work", "money", "city", "country", "world",
    "happy", "sad", "good", "bad", "big", "small", "hot", "cold", "new", "old",
    "one", "two", "three", "first", "last", "always", "never", "now", "today", "tomorrow",
    "apple", "bread", "milk", "coffee", "tea", "color", "red", "blue", "green", "black"
  ],
  A2: [
    "airport", "station", "ticket", "journey", "holiday", "hotel", "restaurant", "menu", "bill", "price",
    "clothes", "shirt", "shoes", "weather", "rain", "snow", "wind", "cloud", "temperature", "degree",
    "doctor", "hospital", "medicine", "pain", "health", "body", "head", "hand", "foot", "eye",
    "computer", "phone", "internet", "website", "email", "message", "screen", "keyboard", "mouse", "camera",
    "music", "movie", "game", "sport", "team", "player", "match", "score", "winner", "loser",
    "beautiful", "ugly", "clean", "dirty", "easy", "difficult", "fast", "slow", "early", "late"
  ],
  B1: [
    "advantage", "disadvantage", "opportunity", "challenge", "success", "failure", "progress", "development", "improvement", "solution",
    "environment", "pollution", "climate", "nature", "wildlife", "resource", "energy", "fuel", "waste", "recycle",
    "economy", "industry", "business", "company", "market", "customer", "product", "service", "quality", "quantity",
    "society", "culture", "tradition", "custom", "belief", "religion", "politics", "government", "law", "rule",
    "education", "knowledge", "skill", "ability", "experience", "memory", "thought", "idea", "opinion", "decision",
    "curious", "anxious", "confident", "patient", "stubborn", "generous", "selfish", "polite", "rude", "honest"
  ],
  B2: [
    "achievement", "ambition", "attitude", "behavior", "character", "concept", "context", "controversy", "criteria", "democracy",
    "diversity", "efficiency", "emphasis", "evaluation", "evidence", "expectation", "factor", "feature", "function", "generation",
    "hypothesis", "identity", "impact", "implication", "incident", "initiative", "innovation", "insight", "interaction", "interpretation",
    "investigation", "justification", "legislation", "maintenance", "mechanism", "motivation", "negotiation", "objective", "obligation", "occurrence",
    "participation", "perception", "phenomenon", "philosophy", "potential", "prediction", "preference", "priority", "procedure", "proportion",
    "adequate", "appropriate", "complex", "consistent", "crucial", "dynamic", "effective", "efficient", "fundamental", "significant"
  ],
  C1: [
    "acquisition", "anomaly", "apparatus", "attribute", "catalyst", "commodity", "consensus", "constraint", "correlation", "deficiency",
    "dichotomy", "discrepancy", "entity", "equilibrium", "hierarchy", "ideology", "implementation", "incentive", "infrastructure", "integration",
    "integrity", "jurisdiction", "magnitude", "manifestation", "methodology", "monopoly", "paradigm", "parameter", "perspective", "prerequisite",
    "prevalence", "proximity", "rationale", "realm", "repertoire", "sanction", "scrutiny", "solidarity", "spectrum", "stipulation",
    "subsidy", "synthesis", "tangent", "trajectory", "transition", "validation", "variance", "velocity", "venue", "volatility",
    "ambiguous", "arbitrary", "comprehensive", "empirical", "explicit", "implicit", "inherent", "intrinsic", "lucid", "pragmatic"
  ]
};

export function getRandomWords(level: string, count: number): string[] {
  const words = wordsByLevel[level] || wordsByLevel['A1'];
  // Shuffle array
  const shuffled = [...words].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
