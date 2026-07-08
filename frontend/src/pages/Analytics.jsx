// frontend/src/pages/Analytics.jsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, TrendingDown, Clock, Award, Loader2,
  ArrowDown, Users, DollarSign, Target, AlertCircle,
  Sparkles, TrendingUp, ShieldQuestion, ShieldCheck, ShieldAlert
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, FunnelChart, Funnel, LabelList,
  LineChart, Line
} from 'recharts'
import api from '../services/api'

const STAGE_COLORS = {
  new: '#3B82F6',
  contacted: '#EAB308',
  proposal: '#F97316',
  negotiation: '#8B5CF6',
  won: '#22C55E',
}

function CustomFunnelTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
        <p className="text-white text-sm font-medium">{d.label}</p>
        <p className="text-gray-400 text-xs mt-1">{d.count} deals · ${d.value.toLocaleString()}</p>
        {d.conversion_from_previous !== null && d.conversion_from_previous !== undefined && (
          <p className="text-violet-400 text-xs mt-1">{d.conversion_from_previous}% from previous stage</p>
        )}
      </div>
    )
  }
  return null
}

function CustomVelocityTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-violet-400 text-sm">{payload[0].value} days avg</p>
        <p className="text-gray-500 text-xs">{payload[0].payload.deal_count} deals measured</p>
      </div>
    )
  }
  return null
}

function CustomForecastTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-violet-400 text-sm">${payload[0].value.toLocaleString()}</p>
      </div>
    )
  }
  return null
}

// ── Funnel section ────────────────────────────────────────────────────────────

function FunnelSection({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 flex items-center justify-center h-80">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  if (!data || data.total_deals === 0) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center py-16">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-700" />
        <p className="text-gray-500">No deals yet to analyze</p>
      </div>
    )
  }

  const maxCumulative = data.stages.length > 0
    ? Math.max(...data.stages.map(s => s.conversion_from_start || 0))
    : 100

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-violet-400" />
          Conversion Funnel
        </h2>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-500">
            Win rate: <span className="text-green-400 font-semibold">{data.overall_win_rate}%</span>
          </span>
          {data.lost_count > 0 && (
            <span className="text-gray-500">
              Lost: <span className="text-red-400 font-semibold">{data.lost_count}</span> (${data.lost_value.toLocaleString()})
            </span>
          )}
        </div>
      </div>
      <p className="text-gray-500 text-xs mb-6">
        Based on {data.total_deals} total deal{data.total_deals !== 1 ? 's' : ''} — bar width shows % that reached each stage
      </p>

      <div className="space-y-3">
        {data.stages.map((stage, i) => {
          const widthPct = maxCumulative > 0
            ? Math.max(((stage.conversion_from_start || 0) / 100) * 100, 4)
            : 4
          const color = STAGE_COLORS[stage.stage] || '#6B7280'

          return (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">{stage.label}</span>
                  <span className="text-gray-500 text-xs">{stage.count} active · ${stage.value.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  {stage.conversion_from_previous !== null && i > 0 && (
                    <span className="text-gray-500 text-xs flex items-center gap-1">
                      <ArrowDown className="w-3 h-3" />
                      {stage.conversion_from_previous}%
                    </span>
                  )}
                  <span className="text-gray-400 text-xs font-medium w-12 text-right">
                    {stage.conversion_from_start}%
                  </span>
                </div>
              </div>
              <div className="h-8 bg-gray-800 rounded-lg overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ delay: i * 0.08 + 0.1, duration: 0.5, ease: 'easeOut' }}
                  className="h-full rounded-lg flex items-center px-3"
                  style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
                >
                  {widthPct > 15 && (
                    <span className="text-white text-xs font-semibold">{stage.count}</span>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Velocity section ───────────────────────────────────────────────────────────

function VelocitySection({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 flex items-center justify-center h-80">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  const chartData = (data?.stages || []).map(s => ({
    ...s,
    fill: STAGE_COLORS[s.stage] || '#6B7280',
  }))

  const hasData = chartData.some(s => s.deal_count > 0)

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
        <Clock className="w-4 h-4 text-violet-400" />
        Stage Velocity
      </h2>
      <p className="text-gray-500 text-xs mb-6">Average days a deal spends in each stage before moving on</p>

      {!hasData ? (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <p>Not enough stage-change history yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${v}d`} />
            <YAxis type="category" dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
            <Tooltip content={<CustomVelocityTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="avg_days" radius={[0, 6, 6, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ── Owner performance section ──────────────────────────────────────────────────

function OwnerSection({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 flex items-center justify-center h-80">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  const owners = data?.owners || []

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Award className="w-4 h-4 text-violet-400" />
          Performance by Owner
        </h2>
        <p className="text-gray-500 text-xs mt-1">Ranked by total won value</p>
      </div>

      {owners.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500 text-sm">No deals with an assigned owner yet</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Owner</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Total</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Won</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Lost</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Open</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Win Rate</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">Won Value</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((o, i) => (
              <motion.tr
                key={o.owner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {o.owner === 'Unassigned' ? '?' : o.owner[0]?.toUpperCase()}
                    </div>
                    <span className="text-white text-sm font-medium">{o.owner}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center text-gray-300 text-sm">{o.total_deals}</td>
                <td className="px-4 py-4 text-center text-green-400 text-sm font-medium">{o.won_deals}</td>
                <td className="px-4 py-4 text-center text-red-400 text-sm">{o.lost_deals}</td>
                <td className="px-4 py-4 text-center text-gray-400 text-sm">{o.open_deals}</td>
                <td className="px-4 py-4 text-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    o.win_rate >= 50 ? 'bg-green-500/10 text-green-400' :
                    o.win_rate >= 25 ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-gray-700/50 text-gray-400'
                  }`}>
                    {o.win_rate}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-white text-sm font-semibold">
                  ${o.won_value.toLocaleString()}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Revenue Forecast section — Feature #52 ────────────────────────────────────

const CONFIDENCE_CONFIG = {
  low:    { label: 'Low Confidence',    icon: ShieldQuestion, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  medium: { label: 'Medium Confidence', icon: ShieldAlert,    color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
  high:   { label: 'High Confidence',   icon: ShieldCheck,    color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
}

function ForecastSection({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 flex items-center justify-center h-80">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center py-16">
        <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-700" />
        <p className="text-gray-500">Forecast unavailable right now</p>
      </div>
    )
  }

  const barData = [
    { label: 'Next 30 Days', value: data.forecast_30_day },
    { label: 'Next 60 Days', value: data.forecast_60_day },
    { label: 'Next 90 Days', value: data.forecast_90_day },
  ]

  const trendData = (data.historical_monthly_won || []).map(m => ({
    month: m.month,
    won_value: m.won_value,
  }))

  const confidenceCfg = CONFIDENCE_CONFIG[data.confidence] || CONFIDENCE_CONFIG.medium
  const ConfidenceIcon = confidenceCfg.icon

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-800 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            AI Revenue Forecast
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            Weighted pipeline projections based on deal scores, historical conversion rates, and stage velocity
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${confidenceCfg.bg} ${confidenceCfg.color} ${confidenceCfg.border}`}>
          <ConfidenceIcon className="w-3.5 h-3.5" />
          {confidenceCfg.label}
        </span>
      </div>

      <div className="p-6">
        {/* Stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Open Deals', value: data.open_deal_count, icon: Target, color: 'bg-blue-500' },
            { label: 'Pipeline Value', value: `$${data.total_pipeline_value.toLocaleString()}`, icon: DollarSign, color: 'bg-gray-600' },
            { label: 'Probability-Weighted', value: `$${data.pipeline_weighted_value.toLocaleString()}`, icon: TrendingUp, color: 'bg-violet-500' },
            { label: '30-Day Forecast', value: `$${data.forecast_30_day.toLocaleString()}`, icon: Sparkles, color: 'bg-green-500' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-gray-800/60 rounded-xl p-4 border border-gray-800"
            >
              <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mb-2`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-gray-400 text-xs">{stat.label}</p>
              <p className="text-white text-lg font-bold mt-0.5">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Forecast bar chart */}
          <div>
            <p className="text-white text-sm font-medium mb-3">Projected Revenue by Window</p>
            {data.forecast_30_day === 0 && data.forecast_60_day === 0 && data.forecast_90_day === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
                No forecasted revenue from current open pipeline
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString()}`} />
                  <Tooltip content={<CustomForecastTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Historical trend line */}
          <div>
            <p className="text-white text-sm font-medium mb-3">Historical Monthly Won Revenue</p>
            {trendData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-500 text-sm text-center px-4">
                Not enough closed-won history yet to show a trend
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString()}`} />
                  <Tooltip content={<CustomForecastTooltip />} />
                  <Line type="monotone" dataKey="won_value" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* AI Narrative */}
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
          <p className="text-gray-300 text-sm leading-relaxed">{data.narrative}</p>
          {data.assumptions?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-violet-500/10">
              <p className="text-gray-500 text-xs font-medium mb-1.5">Methodology</p>
              <ul className="space-y-1">
                {data.assumptions.map((a, i) => (
                  <li key={i} className="text-gray-500 text-xs flex items-start gap-1.5">
                    <span className="text-violet-500 mt-0.5">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [funnel, setFunnel] = useState(null)
  const [velocity, setVelocity] = useState(null)
  const [owners, setOwners] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingForecast, setLoadingForecast] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [funnelRes, velocityRes, ownersRes] = await Promise.all([
          api.get('/deals/analytics/funnel'),
          api.get('/deals/analytics/velocity'),
          api.get('/deals/analytics/by-owner'),
        ])
        setFunnel(funnelRes.data)
        setVelocity(velocityRes.data)
        setOwners(ownersRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()

    const fetchForecast = async () => {
      try {
        const res = await api.get('/deals/analytics/forecast')
        setForecast(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingForecast(false)
      }
    }
    fetchForecast()
  }, [])

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <BarChart3 className="w-6 h-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Pipeline Analytics</h1>
        </div>
        <p className="text-gray-400 mb-8">Where deals come from, where they stall, and who's closing them</p>

        {/* Quick summary cards */}
        {!loading && funnel && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Deals', value: funnel.total_deals, icon: Target, color: 'bg-violet-500' },
              { label: 'Win Rate', value: `${funnel.overall_win_rate}%`, icon: Award, color: 'bg-green-500' },
              { label: 'Lost Deals', value: funnel.lost_count, icon: TrendingDown, color: 'bg-red-500' },
              { label: 'Lost Value', value: `$${funnel.lost_value.toLocaleString()}`, icon: DollarSign, color: 'bg-orange-500' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <div className={`w-9 h-9 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-gray-400 text-xs">{stat.label}</p>
                <p className="text-white text-xl font-bold mt-0.5">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* AI Revenue Forecast — Feature #52 */}
        <div className="mb-6">
          <ForecastSection data={forecast} loading={loadingForecast} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <FunnelSection data={funnel} loading={loading} />
          <VelocitySection data={velocity} loading={loading} />
        </div>

        <OwnerSection data={owners} loading={loading} />

        {/* Methodology note */}
        <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-gray-500 text-xs leading-relaxed">
            Conversion and velocity figures are based on recorded stage-change history. Deals created before
            stage tracking was enabled use their creation date as a starting point, so historical accuracy
            improves over time as more transitions are recorded.
          </p>
        </div>
      </motion.div>
    </div>
  )
}