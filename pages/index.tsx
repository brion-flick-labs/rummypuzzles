import { useEffect, useState } from 'react'

type Puzzle = {
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

type Move = {
  type: 'r' | 'aS' | 'n'
  set: number
  cards: string[]
}

type PuzzleResponse = {
  puzzle: Puzzle | null
  error?: string
}

type DirectionResponse = {
  hasPuzzle: boolean
  nextDate: string | null
}

type PuzzleDates = {
  dates: string[]
  today: string
}

const getCardColor = (card: string) => {
  if (card === '*') return 'bg-gray-200 text-gray-800'
  const suit = card[0]
  switch (suit) {
    case 'R': return 'bg-red-100 text-red-800'
    case 'B': return 'bg-blue-100 text-blue-800'
    case 'G': return 'bg-green-100 text-green-800'
    case 'Y': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const isValidRun = (cards: string[]): boolean => {
  if (cards.length < 3) return false
  
  // Get the suit of the first non-wildcard card
  const firstSuit = cards.find(c => c !== '*')?.[0]
  if (!firstSuit) return false // all wildcards is not a valid run
  
  // Check if all cards are of the same suit or wildcards
  if (!cards.every(c => c === '*' || c[0] === firstSuit)) return false
  
  // Get the numbers, replacing wildcards with null
  const numbers = cards.map(c => c === '*' ? null : parseInt(c.slice(1)))
  
  // Sort the numbers, keeping track of wildcards
  const sorted = [...numbers].sort((a, b) => {
    if (a === null) return 1
    if (b === null) return -1
    return a - b
  })
  
  // Remove any trailing wildcards as they don't affect the sequence
  while (sorted.length > 0 && sorted[sorted.length - 1] === null) {
    sorted.pop()
  }
  
  // Check if the sequence is valid
  let lastNum: number | null = sorted[0]
  let wildcardsAvailable = cards.filter(c => c === '*').length
  
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === null) {
      wildcardsAvailable--
      continue
    }
    if (lastNum === null) {
      lastNum = sorted[i]
      continue
    }
    
    const gap = sorted[i]! - lastNum - 1
    if (gap < 0) return false // numbers are out of order
    if (gap > wildcardsAvailable) return false // not enough wildcards to fill the gap
    
    wildcardsAvailable -= gap
    lastNum = sorted[i]
  }
  
  return true
}

const isValidGroup = (cards: string[]): boolean => {
  if (cards.length < 3) return false
  
  // Get the number of the first non-wildcard card
  const firstNumber = cards.find(c => c !== '*')?.slice(1)
  if (!firstNumber) return false // all wildcards is not a valid group
  
  // Check if all cards have the same number or are wildcards
  if (!cards.every(c => c === '*' || c.slice(1) === firstNumber)) return false
  
  // Check if all suits are different (excluding wildcards)
  const suits = new Set(cards.filter(c => c !== '*').map(c => c[0]))
  return suits.size === cards.filter(c => c !== '*').length
}

const isValidMeld = (cards: string[]): boolean => {
  return isValidRun(cards) || isValidGroup(cards)
}

export default function Home() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [board, setBoard] = useState<string[][]>([])
  const [hand, setHand] = useState<string[]>([])
  const [currentSelection, setCurrentSelection] = useState<string[]>([])
  const [moves, setMoves] = useState<Move[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const [invalidMelds, setInvalidMelds] = useState<number[]>([])
  const [startTime, setStartTime] = useState<number | null>(null)
  const [solveTime, setSolveTime] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<string>('0:00')
  const [failCount, setFailCount] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showInfo, setShowInfo] = useState(true)
  const [showShare, setShowShare] = useState(false)
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [puzzleError, setPuzzleError] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [currentDateIndex, setCurrentDateIndex] = useState<number>(-1)
  const [score, setScore] = useState(0)
  const [usedCardCounts, setUsedCardCounts] = useState<number[]>([])
  const [maxScore, setMaxScore] = useState(0)

  // Load available dates
  useEffect(() => {
    const loadDates = async () => {
      try {
        const response = await fetch('/api/dates')
        if (!response.ok) throw new Error('Failed to load dates')
        const data: PuzzleDates = await response.json()
        
        // Get today's date in EST
        const today = new Date()
        const estDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }))
        const todayEST = new Date(Date.UTC(
          estDate.getFullYear(),
          estDate.getMonth(),
          estDate.getDate()
        ))
        
        // Filter out future dates and sort in descending order
        const sortedDates = data.dates
          .filter(date => {
            const [year, month, day] = date.split('-').map(Number)
            const puzzleDate = new Date(Date.UTC(year, month - 1, day))
            // Allow all dates for now since we're testing with 2025 dates
            return true
          })
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        
        setAvailableDates(sortedDates)
        
        // Find the index of today's date
        const todayIndex = sortedDates.findIndex(date => date === data.today)
        
        // If today's date is not found, start at the beginning
        const index = todayIndex === -1 ? 0 : todayIndex
        setCurrentDateIndex(index)
        setCurrentDate(new Date(sortedDates[index]))
      } catch (err) {
        setError('Failed to load puzzle dates')
      }
    }

    loadDates()
  }, [])

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (startTime && !solveTime) {
      timer = setInterval(() => {
        const timeElapsed = Date.now() - startTime
        setCurrentTime(formatTime(timeElapsed))
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [startTime, solveTime])

  // Load puzzle effect
  useEffect(() => {
    const loadPuzzle = async () => {
      if (currentDateIndex === -1 || !availableDates[currentDateIndex]) return

      try {
        const dateString = availableDates[currentDateIndex]
        const response = await fetch(`/api/today?date=${dateString}`)
        if (!response.ok) {
          throw new Error('Failed to load puzzle')
        }
        const data: PuzzleResponse = await response.json()
        
        if (data.error) {
          setPuzzle(null)
          setBoard([])
          setHand([])
          setPuzzleError(data.error)
        } else if (data.puzzle) {
          setPuzzle(data.puzzle)
          setBoard([]) // Start with an empty board
          setHand(data.puzzle.initial_cards) // Set the initial hand
          setStartTime(Date.now())
          setCurrentTime('0:00')
          setSolveTime(null)
          setFailCount(0)
          setShowSuccess(false)
          setInvalidMelds([])
          setCurrentSelection([])
          setMoves([])
          setFeedback(null)
          setPuzzleError(null)
          setScore(0)
          setUsedCardCounts([])
          
          // Calculate max score based on possible card counts
          const possibleCounts = Object.entries(data.puzzle.possible_card_counts)
            .filter(([_, isPossible]) => isPossible)
            .map(([count]) => parseInt(count))
          
          // Max score is (possible card counts × 2) + 3
          const maxScore = (possibleCounts.length * 2) + 3
          console.log('Max score calculation:', {
            possibleCounts: possibleCounts.length,
            maxScore
          })
          
          setMaxScore(maxScore)
        }
      } catch (err) {
        setPuzzle(null)
        setBoard([])
        setHand([])
        setPuzzleError('Failed to load puzzle')
      }
    }

    loadPuzzle()
  }, [currentDateIndex, availableDates])

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentDateIndex + 1 : currentDateIndex - 1
    if (newIndex >= 0 && newIndex < availableDates.length) {
      // Get today's date in EST
      const today = new Date()
      const estDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const todayEST = new Date(Date.UTC(
        estDate.getFullYear(),
        estDate.getMonth(),
        estDate.getDate()
      ))
      
      // Check if the target date is in the future
      const targetDate = new Date(availableDates[newIndex])
      const [year] = availableDates[newIndex].split('-').map(Number)
      const isFutureDate = targetDate > todayEST
      
      if (!isFutureDate) {
        setCurrentDateIndex(newIndex)
        setCurrentDate(new Date(availableDates[newIndex]))
      }
    }
  }

  const formatDate = (date: Date) => {
    // Create a new date one day ahead
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)
    
    return nextDay.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'America/New_York' // Use EST timezone
    })
  }

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleCardClick = (card: string) => {
    if (currentSelection.includes(card)) {
      setCurrentSelection(currentSelection.filter(c => c !== card))
    } else {
      setCurrentSelection([...currentSelection, card])
    }
  }

  const handleRemoveCard = (setIndex: number, cardIndex: number) => {
    const newBoard = [...board]
    const removedCard = newBoard[setIndex].splice(cardIndex, 1)[0]
    if (newBoard[setIndex].length === 0) {
      newBoard.splice(setIndex, 1)
    }
    setBoard(newBoard)
    setHand(prevHand => [...prevHand, removedCard])
  }

  const handleAddCard = (setIndex: number) => {
    if (currentSelection.length !== 1) {
      setFeedback('Select exactly one card to add')
      return
    }
    const card = currentSelection[0]
    const newBoard = [...board]
    // Add card to meld and sort
    newBoard[setIndex] = [...newBoard[setIndex], card].sort((a, b) => {
      // First sort by suit (first character)
      if (a[0] !== b[0]) {
        return a[0].localeCompare(b[0])
      }
      // Then sort by value (remaining characters)
      return parseInt(a.slice(1)) - parseInt(b.slice(1))
    })
    setBoard(newBoard)
    setHand(hand.filter(c => c !== card))
    setCurrentSelection([])
    setFeedback(null)
  }

  const handleNewMeld = () => {
    if (currentSelection.length < 3) {
      setFeedback('A meld must contain at least 3 cards')
      return
    }
    const newBoard = [...board, currentSelection]
    setBoard(newBoard)
    setHand(hand.filter(card => !currentSelection.includes(card)))
    setCurrentSelection([])
    setFeedback(null)
  }

  const handleSubmit = () => {
    if (!puzzle) return
    
    // Validate all melds
    const invalid = board.reduce((acc, meld, index) => {
      if (!isValidMeld(meld)) {
        acc.push(index)
      }
      return acc
    }, [] as number[])
    
    setInvalidMelds(invalid)
    
    if (invalid.length > 0) {
      setFeedback('Some melds are invalid')
      setFailCount(prev => prev + 1)
      return
    }

    // Calculate total cards used
    const totalCardsUsed = board.reduce((sum, meld) => sum + meld.length, 0)
    
    // Check if this card count is possible and hasn't been used before
    if (puzzle.possible_card_counts[totalCardsUsed] && !usedCardCounts.includes(totalCardsUsed)) {
      setUsedCardCounts(prev => [...prev, totalCardsUsed])
      
      // Check if this is an optimal solution
      const isOptimal = puzzle.optimal_solutions.some(solution => {
        // Extract just the card counts from the solution string
        const melds = solution.split('|').map(meld => meld.trim())
        const totalCards = melds.reduce((sum, meld) => {
          // Extract cards from the meld (format: "S1:card1,card2,card3")
          const cards = meld.split(':')[1].split(',').map(card => card.trim())
          return sum + cards.length
        }, 0)
        return totalCards === totalCardsUsed
      })
      
      const pointsToAdd = isOptimal ? 5 : 2
      setScore(prev => prev + pointsToAdd)
      
      if (isOptimal) {
        setFeedback('Optimal solution! +5 points')
      } else {
        setFeedback('Valid solution! +2 points')
      }
      
      // Check if this is the maximum possible score
      if (usedCardCounts.length + 1 === Object.keys(puzzle.possible_card_counts).filter(k => puzzle.possible_card_counts[k]).length) {
        setShowSuccess(true)
        if (startTime) {
          const timeElapsed = Date.now() - startTime
          setSolveTime(formatTime(timeElapsed))
        }
      }
    } else {
      setFeedback('This card count has already been used or is not possible')
      setFailCount(prev => prev + 1)
    }
  }

  const handleReset = async () => {
    try {
      const response = await fetch('/api/today')
      if (!response.ok) {
        throw new Error('Failed to reset puzzle')
      }
      const data: PuzzleResponse = await response.json()
      
      if (data.error) {
        setError(data.error)
        return
      }
      
      if (data.puzzle) {
        setBoard([]) // Start with an empty board
        setHand(data.puzzle.initial_cards) // Set the initial hand
        setCurrentSelection([])
        setMoves([])
        setFeedback(null)
        setInvalidMelds([])
        setError(null)
      }
    } catch (err) {
      setError('Failed to reset puzzle')
    }
  }

  const handleShare = () => {
    if (!puzzle) return
    
    const date = new Date(puzzle.date).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
    
    const shareText = `I scored ${score}/${maxScore} on the ${date} Rummy Puzzle in ${solveTime || currentTime}!!! 🎮`
    
    setShowShare(true)
  }

  const handleCopyShare = () => {
    if (!puzzle) return
    
    const date = new Date(puzzle.date).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
    
    const shareText = `I scored ${score}/${maxScore} on the ${date} Rummy Puzzle in ${solveTime || currentTime}!!! 🎮`
    
    navigator.clipboard.writeText(shareText)
    setFeedback('Copied to clipboard!')
    setTimeout(() => setFeedback(null), 2000)
  }

  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (!puzzle && !puzzleError) return <div className="p-4">Loading…</div>

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Daily Rummy Puzzle</h1>
          <button
            onClick={() => setShowInfo(true)}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600"
          >
            ?
          </button>
        </div>
        {!puzzleError && (
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            onClick={handleReset}
          >
            Reset Puzzle
          </button>
        )}
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600">
        <div className="flex items-center gap-2">
          {currentDateIndex < availableDates.length - 1 && (() => {
            const nextDate = new Date(availableDates[currentDateIndex + 1])
            const today = new Date()
            const estDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }))
            const todayEST = new Date(Date.UTC(
              estDate.getFullYear(),
              estDate.getMonth(),
              estDate.getDate()
            ))
            const isFutureDate = nextDate > todayEST
            
            return !isFutureDate && (
              <button
                onClick={() => handleDateChange('prev')}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600"
              >
                ←
              </button>
            )
          })()}
          <div>{formatDate(currentDate)}</div>
          {currentDateIndex > 0 && (() => {
            const prevDate = new Date(availableDates[currentDateIndex - 1])
            const today = new Date()
            const estDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }))
            const todayEST = new Date(Date.UTC(
              estDate.getFullYear(),
              estDate.getMonth(),
              estDate.getDate()
            ))
            const isFutureDate = prevDate > todayEST
            
            return !isFutureDate && (
              <button
                onClick={() => handleDateChange('next')}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600"
              >
                →
              </button>
            )
          })()}
        </div>
        <div className="flex items-center gap-4">
          {!puzzleError && startTime && !solveTime && <div>Time: {currentTime}</div>}
          {!puzzleError && solveTime && <div>Solved in {solveTime}</div>}
          {!puzzleError && (
            <div className="bg-gray-100 px-3 py-1 rounded">
              Score: {score}/{maxScore}
            </div>
          )}
        </div>
      </div>
      
      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">How to Play</h2>
              <button
                onClick={() => setShowInfo(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold mb-2">Objective</h3>
                <p>Find all possible ways to arrange the cards into valid melds using different numbers of cards.</p>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">Valid Melds</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <span className="font-semibold">Runs:</span> 3+ cards of the same suit in sequence
                    <br />
                    <span className="text-sm text-gray-600">Example: R1,R2,R3 or B5,B6,B7,B8</span>
                  </li>
                  <li>
                    <span className="font-semibold">Groups:</span> 3+ cards of the same rank but different suits
                    <br />
                    <span className="text-sm text-gray-600">Example: R5,G5,Y5</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2">Wildcards</h3>
                <p>The * card can substitute for any card in a meld.</p>
                <p className="text-sm text-gray-600">Example: R1,*,R3 is a valid run (wildcard acts as R2)</p>
              </div>

              <div>
                <h3 className="font-bold mb-2">How to Play</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Click cards in melds to remove them to your hand</li>
                  <li>Click cards in your hand to select them</li>
                  <li>Click the + button next to a meld to add a selected card</li>
                  <li>Select 3+ cards and click "New Meld" to create a new meld</li>
                  <li>Click "Submit" to check if your solution is valid</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2">Scoring</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Each valid solution using a different number of cards earns 2 points</li>
                  <li>Finding an optimal solution (marked in gold) earns 5 points</li>
                  <li>Try to find all possible card counts to maximize your score!</li>
                  <li>Check the Submitted Counts panel to track your progress</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Board section */}
      <div className="flex gap-4">
        <div className="flex-1 bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-500">Board</h2>
            <div className="text-sm text-gray-500">
              Cards Used: {board.reduce((sum, meld) => sum + meld.length, 0)}/{puzzle?.initial_cards.length || 0}
            </div>
          </div>
          {puzzleError ? (
            <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
              <p className="text-gray-600">
                {puzzleError === 'No Puzzle Available Yet' 
                  ? 'No Puzzle Available Yet'
                  : 'No Puzzle for this date'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {board.map((set, setIndex) => (
                <div key={setIndex} className="flex gap-2">
                  {set.map((card, cardIndex) => (
                    <button
                      key={cardIndex}
                      className={`h-12 w-12 flex items-center justify-center rounded-lg hover:opacity-80 ${
                        invalidMelds.includes(setIndex) ? 'ring-2 ring-red-500' : ''
                      } ${getCardColor(card)}`}
                      onClick={() => handleRemoveCard(setIndex, cardIndex)}
                    >
                      {card}
                    </button>
                  ))}
                  <button
                    className="h-12 w-12 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
                    onClick={() => handleAddCard(setIndex)}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submitted Card Counts section */}
        <div className="w-32 bg-gray-50 rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Submitted Counts</h2>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(puzzle?.possible_card_counts || {})
              .filter(([_, isPossible]) => isPossible)
              .map(([count]) => parseInt(count))
              .sort((a, b) => b - a)
              .map(count => {
                const isSubmitted = usedCardCounts.includes(count)
                const isOptimal = puzzle?.optimal_solutions.some(solution => {
                  // Extract just the card counts from the solution string
                  const melds = solution.split('|').map(meld => meld.trim())
                  const totalCards = melds.reduce((sum, meld) => {
                    // Extract cards from the meld (format: "S1:card1,card2,card3")
                    const cards = meld.split(':')[1].split(',').map(card => card.trim())
                    return sum + cards.length
                  }, 0)
                  return totalCards === count
                })
                
                return (
                  <div key={count} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{count}</span>
                    <div className={`w-4 h-4 rounded ${
                      isSubmitted 
                        ? isOptimal 
                          ? 'bg-yellow-400' // Gold for optimal
                          : 'bg-green-500' // Green for regular
                        : 'bg-gray-200' // Gray for unsubmitted
                    }`} />
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Hand section */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-medium text-gray-500">Hand</h2>
          <div className="text-sm text-gray-500">
            Cards Remaining: {hand.length}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hand.map((card, index) => (
            <button
              key={index}
              className={`h-12 w-12 flex items-center justify-center rounded-lg hover:opacity-80 ${
                currentSelection.includes(card) ? 'ring-2 ring-blue-500' : ''
              } ${getCardColor(card)}`}
              onClick={() => handleCardClick(card)}
            >
              {card}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      {!puzzleError && (
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleNewMeld}
          >
            New Meld
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={handleSubmit}
          >
            Submit
          </button>
          <button
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            onClick={handleShare}
          >
            Share 📤
          </button>
        </div>
      )}

      {/* Feedback message */}
      {feedback && (
        <div className={`p-4 rounded ${
          feedback.includes('Optimal') || feedback.includes('Valid') || feedback.includes('Congratulations') 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {feedback}
        </div>
      )}

      {/* Success modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-green-100 p-6 rounded-lg max-w-sm w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Puzzle Complete! 🎉</h2>
            <p className="mb-4">
              You solved the puzzle in {solveTime}! ⏱️
              {failCount > 0 
                ? `\nYou had ${'❌'.repeat(failCount)} fails` 
                : '\nPerfect solve! 🎯'}
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                onClick={() => setShowSuccess(false)}
              >
                Close ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Share Your Result</h2>
            <div className="bg-gray-100 p-4 rounded-lg mb-4 whitespace-pre-line">
              {puzzle && `I scored ${score}/${maxScore} on the ${new Date(puzzle.date).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })} Rummy Puzzle in ${solveTime || currentTime}!!! 🎮`}
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleCopyShare}
              >
                Copy to Clipboard 📋
              </button>
              <button
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                onClick={() => setShowShare(false)}
              >
                Close ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 