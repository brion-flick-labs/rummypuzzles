import { NextApiRequest, NextApiResponse } from 'next'
import puzzles from '../../data/puzzles2.json'

type PuzzleData = {
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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const puzzleData = puzzles as unknown as PuzzleData[]
    
    // Get today's date in EST
    const today = new Date()
    const estDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const todayEST = new Date(Date.UTC(
      estDate.getFullYear(),
      estDate.getMonth(),
      estDate.getDate()
    ))
    const todayString = todayEST.toISOString().split('T')[0]

    // Get the target date from query parameter or use today
    const targetDate = req.query.date as string || todayString

    // Check if the target date is in the future
    const [year, month, day] = targetDate.split('-').map(Number)
    const targetDateObj = new Date(Date.UTC(year, month - 1, day))
    
    // Allow 2025 dates for testing, but block other future dates
    const isFutureDate = targetDateObj > todayEST && year !== 2025
    
    if (isFutureDate) {
      return res.status(200).json({
        puzzle: null,
        error: 'No Puzzle Available Yet'
      })
    }

    // Find the puzzle for the target date
    const puzzle = puzzleData.find(p => p.date === targetDate)
    
    if (!puzzle) {
      return res.status(200).json({
        puzzle: null,
        error: 'No Puzzle for this date'
      })
    }

    res.status(200).json({ puzzle })
  } catch (error) {
    console.error('Error in today API:', error)
    res.status(500).json({ error: 'Failed to load puzzle' })
  }
} 