import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Position,
  Background,
  Controls,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import dagre from '@dagrejs/dagre'
import { motion, AnimatePresence } from 'framer-motion'
import 'reactflow/dist/style.css'

import { CustodyTreeNode } from './CustodyTreeNode'
import { CustomEdge } from './CustomEdge'
import { AddNodePanel } from './AddNodePanel'
import './styles.css'

// Tree node data structure
export interface TreeNodeData {
  id: string
  name: string
  type: string
  level: number
  holdings: Record<string, number>
  isTerminal: boolean
  children: TreeNodeData[]
  parentId?: string
}

// ETF product info
export interface ETFProduct {
  isin: string
  name: string
  totalShares: number
}

interface KnownEntity {
  id: string
  name: string
  type: string
  lei?: string
  fcaRef?: string
  aumBand?: string
}

interface OwnershipTreeProps {
  rootNode: TreeNodeData | null
  nomineeHoldings: Record<string, number>
  etfProducts: ETFProduct[]
  onAddChild: (parentId: string, node: Omit<TreeNodeData, 'id' | 'children' | 'level'>) => void
  onAddSibling: (siblingId: string, node: Omit<TreeNodeData, 'id' | 'children' | 'level'>) => void
  onDeleteNode: (nodeId: string) => void
  onMarkTerminal: (nodeId: string) => void
  knownEntities: KnownEntity[]
  onCreateEntity?: (entity: KnownEntity) => void
}

// Node types for react-flow
const nodeTypes = {
  custody: CustodyTreeNode,
}

// Edge types for react-flow
const edgeTypes = {
  custom: CustomEdge,
}

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'
) => {
  const isHorizontal = direction === 'LR'
  dagreGraph.setGraph({ rankdir: direction, ranksep: 150, nodesep: 80 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 280, height: 160 })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - 140,
        y: nodeWithPosition.y - 80,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// Convert tree data to react-flow nodes and edges
const treeToFlow = (
  root: TreeNodeData | null,
  nomineeHoldings: Record<string, number>,
  etfProducts: ETFProduct[],
  onAddChild: (parentId: string) => void,
  onAddSibling: (siblingId: string, parentId: string) => void,
  onDeleteNode: (nodeId: string) => void,
  onMarkTerminal: (nodeId: string) => void
): { nodes: Node[]; edges: Edge[] } => {
  if (!root) return { nodes: [], edges: [] }

  const nodes: Node[] = []
  const edges: Edge[] = []

  // First pass: calculate all nodes' remaining shares
  const nodeRemainingShares: Map<string, Record<string, number>> = new Map()
  
  const calculateRemaining = (node: TreeNodeData) => {
    const childrenHoldings: Record<string, number> = {}
    node.children.forEach(child => {
      Object.keys(child.holdings).forEach(isin => {
        childrenHoldings[isin] = (childrenHoldings[isin] || 0) + (child.holdings[isin] || 0)
      })
    })
    
    const remaining: Record<string, number> = {}
    etfProducts.forEach(etf => {
      remaining[etf.isin] = (node.holdings[etf.isin] || 0) - (childrenHoldings[etf.isin] || 0)
    })
    
    nodeRemainingShares.set(node.id, remaining)
    node.children.forEach(calculateRemaining)
  }
  calculateRemaining(root)

  const traverse = (node: TreeNodeData, parentId?: string) => {
    // Get this node's remaining shares (for adding children)
    const remainingShares = nodeRemainingShares.get(node.id) || {}
    const hasRemaining = Object.values(remainingShares).some(v => v > 1000)
    
    // Get parent's remaining shares (for adding siblings)
    const parentRemaining = parentId ? nodeRemainingShares.get(parentId) : null
    const parentHasRemaining = parentRemaining ? Object.values(parentRemaining).some(v => v > 1000) : false
    
    const totalShares = Object.values(node.holdings).reduce((sum, v) => sum + v, 0)

    nodes.push({
      id: node.id,
      type: 'custody',
      data: {
        ...node,
        etfProducts,
        remainingShares,
        hasRemaining,
        totalShares,
        // Add Child: only if this node has remaining shares AND is not terminal
        onAddChild: !node.isTerminal ? () => onAddChild(node.id) : undefined,
        // Add Sibling: only if parent has remaining shares
        onAddSibling: parentId && parentHasRemaining ? () => onAddSibling(node.id, parentId) : undefined,
        onDelete: node.level > 0 ? () => onDeleteNode(node.id) : undefined,
        onMarkTerminal: !node.isTerminal ? () => onMarkTerminal(node.id) : undefined,
      },
      position: { x: 0, y: 0 },
    })

    if (parentId) {
      edges.push({
        id: `${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'custom',
        animated: false,
        data: {
          sourceType: nodes.find(n => n.id === parentId)?.data.type,
          targetType: node.type,
          shares: totalShares,
        },
      })
    }

    node.children.forEach(child => traverse(child, node.id))
  }

  traverse(root)
  return getLayoutedElements(nodes, edges, 'LR')
}

// Inner component with ReactFlow hooks
const OwnershipTreeInner: React.FC<OwnershipTreeProps> = ({
  rootNode,
  nomineeHoldings,
  etfProducts,
  onAddChild,
  onAddSibling,
  onDeleteNode,
  onMarkTerminal,
  knownEntities,
  onCreateEntity,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [addPanelContext, setAddPanelContext] = useState<{
    mode: 'child' | 'sibling'
    parentId: string
    siblingId?: string
    availableShares: Record<string, number>
  } | null>(null)
  const { fitView } = useReactFlow()

  // Store computed node data for callbacks to use
  const nodesRef = useRef<Node[]>([])
  nodesRef.current = nodes

  // Handle add child - uses ref to always have latest nodes
  const handleAddChild = useCallback((parentId: string) => {
    const parentNode = nodesRef.current.find(n => n.id === parentId)
    if (!parentNode) {
      console.warn('Parent node not found:', parentId)
      return
    }

    setAddPanelContext({
      mode: 'child',
      parentId,
      availableShares: parentNode.data.remainingShares || {},
    })
    setShowAddPanel(true)
  }, [])

  // Handle add sibling - uses ref to always have latest nodes
  const handleAddSibling = useCallback((siblingId: string, parentId: string) => {
    const parentNode = nodesRef.current.find(n => n.id === parentId)
    if (!parentNode) {
      console.warn('Parent node not found for sibling:', parentId)
      return
    }

    setAddPanelContext({
      mode: 'sibling',
      parentId,
      siblingId,
      availableShares: parentNode.data.remainingShares || {},
    })
    setShowAddPanel(true)
  }, [])

  // Update nodes when tree changes
  useEffect(() => {
    if (!rootNode) {
      setNodes([])
      setEdges([])
      return
    }
    
    const { nodes: flowNodes, edges: flowEdges } = treeToFlow(
      rootNode,
      nomineeHoldings,
      etfProducts,
      handleAddChild,
      handleAddSibling,
      onDeleteNode,
      onMarkTerminal
    )
    
    console.log('Tree rendered with nodes:', flowNodes.length, 'edges:', flowEdges.length)
    
    setNodes(flowNodes)
    setEdges(flowEdges)
    
    // Fit view after layout
    setTimeout(() => fitView({ padding: 0.3, duration: 500 }), 150)
  }, [rootNode, nomineeHoldings, etfProducts, handleAddChild, handleAddSibling, onDeleteNode, onMarkTerminal, setNodes, setEdges, fitView])

  // Handle panel submission
  const handleAddNode = useCallback((nodeData: {
    name: string
    type: string
    holdings: Record<string, number>
    isTerminal: boolean
  }) => {
    if (!addPanelContext) return

    if (addPanelContext.mode === 'child') {
      onAddChild(addPanelContext.parentId, nodeData)
    } else {
      onAddSibling(addPanelContext.siblingId!, nodeData)
    }

    setShowAddPanel(false)
    setAddPanelContext(null)
  }, [addPanelContext, onAddChild, onAddSibling])

  return (
    <div className="ownership-tree-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          color="#1a1f2e" 
          gap={20} 
          size={1}
          style={{ backgroundColor: '#0a0e1a' }}
        />
        <Controls 
          className="tree-controls"
          showInteractive={false}
        />
        {/* MiniMap removed - not needed for typical tree sizes */}
      </ReactFlow>

      {/* Add Node Panel */}
      <AnimatePresence>
        {showAddPanel && addPanelContext && (
          <AddNodePanel
            mode={addPanelContext.mode}
            availableShares={addPanelContext.availableShares}
            etfProducts={etfProducts}
            knownEntities={knownEntities}
            onSubmit={handleAddNode}
            onClose={() => {
              setShowAddPanel(false)
              setAddPanelContext(null)
            }}
            onCreateEntity={onCreateEntity}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Main component with provider
export const OwnershipTree: React.FC<OwnershipTreeProps> = (props) => {
  return (
    <ReactFlowProvider>
      <OwnershipTreeInner {...props} />
    </ReactFlowProvider>
  )
}

export default OwnershipTree

