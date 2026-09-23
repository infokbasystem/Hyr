import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

function createTicks(maxValue) {
  const step = 5000
  const topValue = Math.max(20000, Math.ceil(maxValue / step) * step)
  const ticks = []

  for (let value = 0; value <= topValue; value += step) {
    ticks.push(value)
  }

  return ticks
}

export default function FinanceWeeklyChart({ data }) {
  const maxValue = Math.max(
    1,
    ...data.map((entry) => Math.max(entry.intakter ?? 0, entry.kassaflode ?? 0))
  )
  const yTicks = createTicks(maxValue)
  const topValue = yTicks[yTicks.length - 1] ?? maxValue

  return (
    <div className="pt-1">
      <div className="h-[248px] w-full" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, bottom: 14, left: 6 }} barGap={2}>
            <XAxis
              dataKey="label"
              interval={0}
              tickLine={{ stroke: '#78716c' }}
              axisLine={{ stroke: '#78716c' }}
              tick={{ fill: '#57534e', fontSize: '0.675rem' }}
            />
            <YAxis
              allowDecimals={false}
              ticks={yTicks}
              domain={[0, topValue]}
              tickLine={{ stroke: '#78716c' }}
              axisLine={{ stroke: '#78716c' }}
              tick={{ fill: '#57534e', fontSize: '0.675rem' }}
              tickFormatter={(value) => (value === 0 ? '' : new Intl.NumberFormat('sv-SE').format(value))}
              width={52}
            />
            <Bar dataKey="intakter" fill="#d9601f" maxBarSize={18} radius={[1, 1, 0, 0]} />
            <Bar dataKey="kassaflode" fill="#efc236" maxBarSize={18} radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
