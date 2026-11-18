import React from 'react'
import { DollarSign, Activity, Users, AlertTriangle } from '../icons'

export function OverviewCards({ kpis }) {
  if (!kpis) return null

  const cards = [
    {
      title: "Total Payments",
      value: kpis.total_payments?.toLocaleString() || "0",
      sub: `$${(kpis.total_volume_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Total Volume`,
      icon: DollarSign,
      iconBg: '#eff6ff',
      iconColor: '#2563eb'
    },
    {
      title: "Dispute Rate",
      value: `${(kpis.overall_dispute_rate || 0).toFixed(2)}%`,
      sub: `${kpis.total_disputes || 0} disputes opened across all teams`,
      icon: Activity,
      iconBg: '#fff7ed',
      iconColor: '#ea580c'
    },
    {
      title: "Win Rate",
      value: `${(kpis.overall_win_rate || 0).toFixed(1)}%`,
      sub: "Defended successfully with documentary evidence",
      icon: Users,
      iconBg: '#ecfdf5',
      iconColor: '#059669'
    },
    {
      title: "Loss Exposure",
      value: `$${(kpis.total_expected_loss_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `$${(kpis.total_actual_loss_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} actual chargeback losses`,
      icon: AlertTriangle,
      iconBg: '#fef2f2',
      iconColor: '#dc2626'
    }
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem'
    }}>
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <div key={i} style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>{c.title}</span>
              <div style={{
                backgroundColor: c.iconBg,
                color: c.iconColor,
                padding: '0.4rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon style={{ width: '1.1rem', height: '1.1rem' }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
                {c.value}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {c.sub}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
