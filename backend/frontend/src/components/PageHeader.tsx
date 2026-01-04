import { useNavigate } from 'react-router-dom'
import RoleSelector from './RoleSelector'
import './PageHeader.css'

interface PageHeaderProps {
  title: string
  subtitle?: string
}

function PageHeader({ title, subtitle }: PageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(-1) // Go back to previous page
  }

  return (
    <>
      {/* Fixed role selector and back button in top right corner */}
      <div className="top-right-controls">
        <button 
          className="back-button"
          onClick={handleBack}
          aria-label="Go back"
          title="Go back"
        >
          ← Back
        </button>
        <RoleSelector />
      </div>
      
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h1 className="page-header-title">{title}</h1>
            {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
          </div>
        </div>
      </div>
    </>
  )
}

export default PageHeader

