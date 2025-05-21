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
    console.log('Raw puzzles data:', JSON.stringify(puzzles[0], null, 2))
    
    const puzzleData = puzzles as unknown as PuzzleData[]
    console.log('Loading dates from puzzles:', puzzleData.length, 'puzzles found')
    
    // Get all dates from puzzles and sort them in descending order (newest first)
    const dates = puzzleData
      .map(p => {
        console.log('Processing puzzle:', p)
        return p.date
      })
      .filter(date => {
        console.log('Filtering date:', date)
        return date !== undefined
      })
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    
    console.log('Extracted dates:', dates)

    // Get today's date in EST
    const today = new Date()
    const estDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const todayEST = new Date(Date.UTC(
      estDate.getFullYear(),
      estDate.getMonth(),
      estDate.getDate()
    ))
    const todayString = todayEST.toISOString().split('T')[0]
    
    console.log('Today in EST:', todayString)

    const response = {
      dates,
      today: todayString
    }
    console.log('Sending response:', response)
    
    res.status(200).json(response)
  } catch (error) {
    console.error('Error in dates API:', error)
    res.status(500).json({ error: 'Failed to load dates' })
  }
} 