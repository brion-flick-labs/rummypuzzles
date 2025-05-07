import { NextApiRequest, NextApiResponse } from 'next'
import puzzles from '../../data/puzzles.json'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { date, direction } = req.query
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let targetDate: Date
  if (date) {
    targetDate = new Date(date as string)
    targetDate.setHours(0, 0, 0, 0)
  } else {
    targetDate = today
  }

  // Handle direction check
  if (direction) {
    const dir = direction as 'prev' | 'next'
    const dates = puzzles.map(p => new Date(p.date))
    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime())
    
    let nextDate: Date | null = null
    if (dir === 'prev') {
      nextDate = sortedDates.filter(d => d < targetDate).pop() || null
    } else {
      nextDate = sortedDates.find(d => d > targetDate) || null
    }

    res.status(200).json({ 
      hasPuzzle: nextDate !== null,
      nextDate: nextDate?.toISOString().split('T')[0] || null
    })
    return
  }

  // Only allow dates up to today
  if (targetDate > today) {
    res.status(200).json({ puzzle: null, error: 'Cannot access future puzzles' })
    return
  }

  const dateString = targetDate.toISOString().split('T')[0]
  const puzzle = puzzles.find(p => p.date === dateString)

  if (!puzzle) {
    res.status(200).json({ puzzle: null, error: 'No puzzle available for this date' })
    return
  }

  res.status(200).json({ puzzle })
} 