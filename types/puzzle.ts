export interface Puzzle {
  date: string
  initial_cards: string[]
  possible_card_counts: { [key: string]: boolean }
  optimal_solutions: string[]
  optimal_solution_cards: string[]
  include_wildcards: boolean
  score: {
    max_cards_used: number
    num_optimal_solutions: number
  }
} 