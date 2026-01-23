import React from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow'
import { motion } from 'framer-motion'

// Get color based on entity type
const getEdgeColor = (sourceType: string, targetType: string): string => {
  // Use target type for color
  if (targetType?.includes('CSD') || targetType?.includes('Nominee')) return '#3b82f6'
  if (targetType?.includes('Global')) return '#8b5cf6'
  if (targetType?.includes('Regional') || targetType?.includes('Local')) return '#14b8a6'
  if (targetType?.includes('Wealth')) return '#10b981'
  if (targetType?.includes('Asset')) return '#f59e0b'
  if (targetType?.includes('Private')) return '#06b6d4'
  if (targetType?.includes('Execution')) return '#ec4899'
  return '#6b7280'
}

export const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.3,
  })

  const edgeColor = getEdgeColor(data?.sourceType, data?.targetType)
  const shares = data?.shares || 0
  
  // Calculate stroke width based on shares (min 2, max 8)
  const strokeWidth = Math.min(Math.max(2, Math.log10(shares + 1) * 1.5), 8)

  return (
    <>
      {/* Glow effect */}
      <path
        d={edgePath}
        fill="none"
        stroke={edgeColor}
        strokeWidth={strokeWidth + 6}
        strokeOpacity={0.1}
        filter="blur(4px)"
      />
      
      {/* Main edge path */}
      <motion.path
        id={id}
        d={edgePath}
        fill="none"
        stroke={edgeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.8 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={style}
        markerEnd={markerEnd}
        className="react-flow__edge-path"
      />

      {/* Animated flow dots */}
      <motion.circle
        r={3}
        fill={edgeColor}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 1,
          times: [0, 0.1, 0.9, 1],
        }}
      >
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={edgePath}
        />
      </motion.circle>

      {/* Second dot with offset */}
      <motion.circle
        r={2}
        fill={edgeColor}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0.7, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 1,
          delay: 0.3,
          times: [0, 0.1, 0.9, 1],
        }}
      >
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={edgePath}
          begin="0.3s"
        />
      </motion.circle>

      {/* Edge label (optional - shows shares) */}
      {shares > 0 && (
        <EdgeLabelRenderer>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="edge-label px-2 py-1 rounded-md bg-gray-900/90 border border-gray-700 text-[10px] text-gray-300 font-mono shadow-lg"
          >
            {shares >= 1e6 ? `${(shares / 1e6).toFixed(1)}M` : `${(shares / 1e3).toFixed(0)}K`}
          </motion.div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default CustomEdge

