export interface Dictionary {
  id: string;
  user_id: string;
  title: string;
  description: string;
  target_language: string;
  native_language: string;
  is_public: boolean;
  created_at: string;
  // This might be computed/joined, not strictly in the DB table initially
  wordCount?: number; 
}

export interface Word {
  id: string;
  dictionary_id: string;
  user_id: string;
  term: string;
  definition: string;
  example_sentence?: string;
  next_review_date: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  created_at: string;
}
