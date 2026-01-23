import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrendingUp } from 'lucide-react'
import StatCard from '../../components/shared/StatCard'

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total Users" value={1234} />)
    
    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('1234')).toBeInTheDocument()
  })

  it('renders with icon', () => {
    render(
      <StatCard 
        label="Users" 
        value={100} 
        icon={TrendingUp}
        iconColor="text-accent-400"
      />
    )
    
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('renders with positive trend', () => {
    render(
      <StatCard 
        label="Growth" 
        value="5,000"
        trend={{ value: 12, label: 'vs last month' }}
      />
    )
    
    expect(screen.getByText('Growth')).toBeInTheDocument()
    expect(screen.getByText('5,000')).toBeInTheDocument()
    expect(screen.getByText('12%')).toBeInTheDocument()
    expect(screen.getByText('vs last month')).toBeInTheDocument()
  })

  it('renders with negative trend', () => {
    render(
      <StatCard 
        label="Revenue" 
        value="$10K"
        trend={{ value: -5, label: 'vs last week' }}
      />
    )
    
    expect(screen.getByText('5%')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(
      <StatCard 
        label="Active Sessions" 
        value={42}
        subtitle="Current count"
      />
    )
    
    expect(screen.getByText('Current count')).toBeInTheDocument()
  })

  it('applies variant styles', () => {
    const { container } = render(
      <StatCard 
        label="Test" 
        value={1}
        variant="primary"
      />
    )
    
    // Check that primary variant class is applied
    expect(container.firstChild).toHaveClass('bg-primary-500/10')
  })
})



