import { NextApiRequest, NextApiResponse } from 'next'
import puzzles from '../../data/puzzles.json'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { date, direction } = req.query

    // Get today's date in EST
    const today = new Date()
    const estDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const todayEST = new Date(Date.UTC(
      estDate.getFullYear(),
      estDate.getMonth(),
      estDate.getDate()
    ))

    let targetDate: Date
    if (date) {
      // Parse the input date in EST
      const [year, month, day] = (date as string).split('-').map(Number)
      targetDate = new Date(Date.UTC(year, month - 1, day))
    } else {
      targetDate = todayEST
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

    // For testing purposes, allow all dates in 2025
    const isTestDate = targetDate.getUTCFullYear() === 2025

    // Check if the date is in the future
    const isFutureDate = targetDate > todayEST

    // If it's a future date (not a test date), show the "not available yet" message
    if (!isTestDate && isFutureDate) {
      res.status(200).json({ puzzle: null, error: 'No Puzzle Available Yet' })
      return
    }

    const dateString = targetDate.toISOString().split('T')[0]
    const puzzle = puzzles.find(p => p.date === dateString)

    if (!puzzle) {
      res.status(200).json({ puzzle: null, error: 'No puzzle available for this date' })
      return
    }

    res.status(200).json({ puzzle })
  } catch (error) {
    console.error('Error in today API:', error)
    res.status(500).json({ error: 'Failed to load puzzle' })
  }
} 