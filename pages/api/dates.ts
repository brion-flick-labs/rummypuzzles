import { NextApiRequest, NextApiResponse } from 'next'
import puzzles from '../../data/puzzles.json'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get all dates from puzzles and sort them in descending order (newest first)
    const dates = puzzles
      .map(p => p.date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    // Get today's date in EST
    const today = new Date()
    const estDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const todayEST = new Date(Date.UTC(
      estDate.getFullYear(),
      estDate.getMonth(),
      estDate.getDate()
    ))
    const todayString = todayEST.toISOString().split('T')[0]

    res.status(200).json({
      dates,
      today: todayString
    })
  } catch (error) {
    console.error('Error in dates API:', error)
    res.status(500).json({ error: 'Failed to load dates' })
  }
} 