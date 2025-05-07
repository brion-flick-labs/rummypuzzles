import { NextApiRequest, NextApiResponse } from 'next'
import puzzles from '../../data/puzzles.json'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get all dates from puzzles and sort them in descending order (newest first)
  const dates = puzzles
    .map(p => p.date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  // Find today's date in the list
  const todayString = today.toISOString().split('T')[0]
  const todayIndex = dates.indexOf(todayString)

  res.status(200).json({
    dates,
    today: todayString
  })
} 