/**
 * NAV Chart Component
 * Displays historical NAV data with interactive chart
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react'
import { getNAVHistory, NAVHistoryPoint, formatCurrency } from '../services/navApi'

interface NAVChartProps {
  isin: string
  name?: string
  currency?: string
  onDataLoad?: (data: NAVHistoryPoint[]) => void
}

type Period = '1mo' | '3mo' | '6mo' | '1y' | '2y' | 'max'

const NAVChart: React.FC<NAVChartProps> = ({ isin, name, currency = 'EUR', onDataLoad }) => {
  const [data, setData] = useState<NAVHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('1y')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    const result = await getNAVHistory(isin, { period })
    
    if (result && result.data.length > 0) {
      setData(result.data)
      onDataLoad?.(result.data)
    } else {
      setError('No NAV data available for this ISIN')
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [isin, period])

  // Calculate stats
  const stats = data.length > 0 ? {
    current: data[data.length - 1].nav,
    start: data[0].nav,
    high: Math.max(...data.map(d => d.nav)),
    low: Math.min(...data.map(d => d.nav)),
    change: data[data.length - 1].nav - data[0].nav,
    changePct: ((data[data.length - 1].nav - data[0].nav) / data[0].nav) * 100,
    avg: data.reduce((sum, d) => sum + d.nav, 0) / data.length
  } : null

  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€'

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-500">
        <p className="text-sm">{error}</p>
        <p className="text-xs mt-2">ISIN: {isin}</p>
        <button 
          onClick={fetchData}
          className="mt-4 text-sm text-primary-400 hover:text-primary-300 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-white">{name || isin}</h4>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-2xl font-bold text-white">
              {symbol}{stats?.current.toFixed(2)}
            </span>
            {stats && (
              <span className={`flex items-center gap-1 text-sm ${
                stats.changePct >= 0 ? 'text-accent-400' : 'text-red-400'
              }`}>
                {stats.changePct >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {stats.changePct >= 0 ? '+' : ''}{stats.changePct.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        
        {/* Period selector */}
        <div className="flex items-center gap-1">
          {(['1mo', '3mo', '6mo', '1y', '2y'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                period === p
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-800/50 text-gray-400 hover:text-white'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
          <button
            onClick={fetchData}
            className="ml-2 p-1.5 rounded bg-dark-800/50 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id={`navGradient-${isin}`} x1="0" y1="0" x2="0" y2="1">
                <stop 
                  offset="5%" 
                  stopColor={stats && stats.changePct >= 0 ? '#22c56d' : '#ef4444'} 
                  stopOpacity={0.3}
                />
                <stop 
                  offset="95%" 
                  stopColor={stats && stats.changePct >= 0 ? '#22c56d' : '#ef4444'} 
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280" 
              fontSize={10}
              tickFormatter={(val) => {
                const date = new Date(val)
                return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
              }}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={10}
              tickFormatter={(val) => `${symbol}${val.toFixed(0)}`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1d24',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
              formatter={(value: number) => [`${symbol}${value.toFixed(2)}`, 'NAV']}
              labelFormatter={(label) => new Date(label).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            />
            {stats && <ReferenceLine y={stats.avg} stroke="#6366f1" strokeDasharray="5 5" />}
            <Area
              type="monotone"
              dataKey="nav"
              stroke={stats && stats.changePct >= 0 ? '#22c56d' : '#ef4444'}
              fill={`url(#navGradient-${isin})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 pt-2 border-t border-white/5">
          <div className="text-center">
            <div className="text-xs text-gray-500">High</div>
            <div className="text-sm font-medium text-white">{symbol}{stats.high.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Low</div>
            <div className="text-sm font-medium text-white">{symbol}{stats.low.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Average</div>
            <div className="text-sm font-medium text-purple-400">{symbol}{stats.avg.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Data Points</div>
            <div className="text-sm font-medium text-white">{data.length}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NAVChart

