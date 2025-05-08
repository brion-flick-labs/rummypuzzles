import { NextApiRequest, NextApiResponse } from 'next'
import puzzles from '../../data/puzzles.json'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
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
    const puzzle = puzzles.find(p => p.date === targetDate)
    
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