const React = require('react');
const { DndProvider, useDrag, useDrop } = require('react-dnd');
const { HTML5Backend } = require('react-dnd-html5-backend');

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

const DocumentStructureTree = ({ 
    structure,
    onMove,
    onSelect,
    selectedId,
    numberingScheme,
    onChangeNumberingScheme
}) => {
    return (
        <DndProvider backend={HTML5Backend}>
            <div className="document-structure-tree">
                <div className="numbering-scheme-selector">
                    <select 
                        value={numberingScheme}
                        onChange={(e) => onChangeNumberingScheme(e.target.value)}
                        className="scheme-select"
                    >
                        <option value="decimal">1.2.3.4</option>
                        <option value="alphaUpper">A.B.C.D</option>
                        <option value="alphaLower">a.b.c.d</option>
                        <option value="roman">I.II.III.IV</option>
                        <option value="hybrid1">1.A.1.a</option>
                        <option value="hybrid2">1.1.1.1 (Legal)</option>
                    </select>
                </div>
                <div className="tree-container">
                    {structure.map((node, index) => (
                        <TreeNode
                            key={node.id}
                            node={node}
                            level={0}
                            onMove={onMove}
                            onSelect={onSelect}
                            selectedId={selectedId}
                        />
                    ))}
                </div>
            </div>
        </DndProvider>
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
