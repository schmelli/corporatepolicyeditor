import React from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
    TreeView, 
    TreeItem, 
    Box, 
    IconButton, 
    Typography, 
    Tooltip, 
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel 
} from '@material-ui/core';
import { 
    ExpandMore, 
    ChevronRight, 
    Add, 
    Delete, 
    Edit, 
    Description, 
    Folder, 
    FolderOpen 
} from '@material-ui/icons';

const TreeNode = ({ node, level, onMove, onSelect, selectedId }) => {
    const [{ isDragging }, drag] = useDrag({
        type: 'SECTION',
        item: { id: node.id, level },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });

    const [{ isOver }, drop] = useDrop({
        accept: 'SECTION',
        drop: (item, monitor) => {
            const didDrop = monitor.didDrop();
            if (didDrop) {
                return;
            }

            if (item.id !== node.id) {
                // Calculate position based on mouse position
                const clientOffset = monitor.getClientOffset();
                const hoverBoundingRect = ref.current?.getBoundingClientRect();
                
                if (clientOffset && hoverBoundingRect) {
                    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
                    const hoverClientY = clientOffset.y - hoverBoundingRect.top;

                    // If mouse is in the upper half, place before; if in lower half, place after
                    const position = hoverClientY < hoverMiddleY ? 'before' : 'after';
                    
                    onMove(item.id, node.id, position);
                }
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true })
        })
    });

    const ref = React.useRef(null);
    const dragDropRef = drag(drop(ref));

    const style = {
        paddingLeft: `${level * 20}px`,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isOver ? '#e8f0fe' : selectedId === node.id ? '#e3f2fd' : 'transparent',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        padding: '8px',
        marginBottom: '2px',
        borderRadius: '4px',
        transition: 'all 0.2s'
    };

    const numberStyle = {
        marginRight: '8px',
        color: '#666',
        minWidth: '40px'
    };

    const expandIconStyle = {
        marginRight: '8px',
        cursor: 'pointer',
        transition: 'transform 0.2s'
    };

    const [isExpanded, setIsExpanded] = React.useState(true);

    const handleExpand = (e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    return (
        <div>
            <div
                ref={dragDropRef}
                style={style}
                onClick={() => onSelect(node.id)}
                className="tree-node"
            >
                <span 
                    style={expandIconStyle}
                    onClick={handleExpand}
                    className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                >
                    {node.children?.length > 0 && (
                        isExpanded ? '▼' : '▶'
                    )}
                </span>
                <span style={numberStyle}>{node.number}</span>
                <span>{node.title}</span>
            </div>
            {isExpanded && node.children?.length > 0 && (
                <div className="children">
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            onMove={onMove}
                            onSelect={onSelect}
                            selectedId={selectedId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const DocumentStructureTree = ({ onSelect, numberingScheme, onChangeNumberingScheme }) => {
    const [expanded, setExpanded] = React.useState(['root']);
    const [selected, setSelected] = React.useState('');
    const [nodes, setNodes] = React.useState([
        {
            id: 'root',
            name: 'Project Root',
            type: 'folder',
            children: [
                {
                    id: 'section1',
                    name: 'Section 1',
                    type: 'folder',
                    children: [
                        {
                            id: 'doc1',
                            name: 'Introduction.md',
                            type: 'document'
                        },
                        {
                            id: 'doc2',
                            name: 'Overview.md',
                            type: 'document'
                        }
                    ]
                },
                {
                    id: 'section2',
                    name: 'Section 2',
                    type: 'folder',
                    children: [
                        {
                            id: 'doc3',
                            name: 'Details.md',
                            type: 'document'
                        }
                    ]
                }
            ]
        }
    ]);

    const handleToggle = (event, nodeIds) => {
        setExpanded(nodeIds);
    };

    const handleSelect = (event, nodeId) => {
        setSelected(nodeId);
        if (onSelect) {
            const node = findNode(nodes[0], nodeId);
            if (node) {
                onSelect(node);
            }
        }
    };

    const findNode = (node, id) => {
        if (node.id === id) return node;
        if (node.children) {
            for (let child of node.children) {
                const found = findNode(child, id);
                if (found) return found;
            }
        }
        return null;
    };

    const renderTree = (nodes) => (
        nodes.map((node) => (
            <TreeItem
                key={node.id}
                nodeId={node.id}
                label={
                    <Box sx={{ display: 'flex', alignItems: 'center', p: 0.5, pr: 0 }}>
                        {node.type === 'folder' ? 
                            <FolderOpen fontSize="small" sx={{ mr: 1, color: '#dcb67a' }} /> : 
                            <Description fontSize="small" sx={{ mr: 1, color: '#519aba' }} />
                        }
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                            {node.name}
                        </Typography>
                        <Box sx={{ 
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            '.MuiTreeItem-content:hover &': { opacity: 1 }
                        }}>
                            {node.type === 'folder' && (
                                <Tooltip title="Add Document">
                                    <IconButton size="small" onClick={(e) => {
                                        e.stopPropagation();
                                        // TODO: Implement add functionality
                                    }}>
                                        <Add fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <Tooltip title="Edit">
                                <IconButton size="small" onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implement edit functionality
                                }}>
                                    <Edit fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                                <IconButton size="small" onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implement delete functionality
                                }}>
                                    <Delete fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                }
                sx={{
                    '& .MuiTreeItem-content': {
                        padding: '2px 8px',
                        borderRadius: 1,
                        '&:hover': {
                            bgcolor: 'action.hover'
                        },
                        '&.Mui-selected': {
                            bgcolor: 'primary.main',
                            '&:hover': {
                                bgcolor: 'primary.dark'
                            }
                        }
                    }
                }}
            >
                {Array.isArray(node.children) ? node.children.map((node) => renderTree([node])) : null}
            </TreeItem>
        ))
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
                <InputLabel>Numbering Scheme</InputLabel>
                <Select
                    value={numberingScheme || 'decimal'}
                    onChange={(e) => onChangeNumberingScheme?.(e.target.value)}
                    label="Numbering Scheme"
                >
                    <MenuItem value="decimal">1.2.3.4</MenuItem>
                    <MenuItem value="alpha">A.B.C.D</MenuItem>
                    <MenuItem value="roman">I.II.III.IV</MenuItem>
                    <MenuItem value="hybrid1">1.A.1.a</MenuItem>
                    <MenuItem value="hybrid2">1.1.1.1 (Legal)</MenuItem>
                </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <TreeView
                    aria-label="document structure"
                    defaultCollapseIcon={<ExpandMore />}
                    defaultExpandIcon={<ChevronRight />}
                    expanded={expanded}
                    selected={selected}
                    onNodeToggle={handleToggle}
                    onNodeSelect={handleSelect}
                    sx={{
                        flexGrow: 1,
                        maxWidth: 400,
                        overflowY: 'auto'
                    }}
                >
                    {renderTree(nodes)}
                </TreeView>
            </Box>
        </Box>
    );
};

// Styles
const styles = `
.document-structure-tree {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
    border-right: 1px solid #e0e0e0;
}

.numbering-scheme-selector {
    padding: 12px;
    border-bottom: 1px solid #e0e0e0;
}

.scheme-select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    font-size: 14px;
}

.tree-container {
    flex-grow: 1;
    overflow-y: auto;
    padding: 12px;
}

.tree-node {
    user-select: none;
}

.tree-node:hover {
    background-color: #f5f5f5 !important;
}

.expand-icon {
    font-size: 12px;
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.expand-icon.expanded {
    transform: rotate(0deg);
}

.children {
    transition: all 0.3s ease-in-out;
}
`;

// Create and inject styles
const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

module.exports = DocumentStructureTree;
