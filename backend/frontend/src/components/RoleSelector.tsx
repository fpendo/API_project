import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './RoleSelector.css'

const roles = [
  { name: 'Landowner', path: '/landowner' },
  { name: 'Regulator', path: '/regulator' },
  { name: 'Broker', path: '/broker' },
  { name: 'Developer', path: '/developer' },
  { name: 'Planning Officer', path: '/planning' },
  { name: 'Operator', path: '/operator' }
]

function RoleSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get current role name from path
  const currentRole = roles.find(role => role.path === location.pathname)?.name || 'Select Role'

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleRoleSelect = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  return (
    <div className="role-selector" ref={dropdownRef}>
      <button
        className="role-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>{currentRole}</span>
        <span className="role-selector-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="role-selector-dropdown">
          {roles.map((role) => (
            <button
              key={role.path}
              className={`role-selector-option ${location.pathname === role.path ? 'active' : ''}`}
              onClick={() => handleRoleSelect(role.path)}
            >
              {role.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default RoleSelector




