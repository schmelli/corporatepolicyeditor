const React = require('react');
const { format } = require('date-fns');

const VersionHistory = ({ 
    versions, 
    currentVersion, 
    onVersionSelect, 
    onVersionCompare,
    onVersionRestore 
}) => {
    const [selectedVersions, setSelectedVersions] = React.useState([]);
    const [expandedVersions, setExpandedVersions] = React.useState(new Set());

    // Format diff for display
    const formatDiff = (diff) => {
        if (!diff) return null;

        return diff.map((change, index) => {
            const [type, text] = change;
            const className = type === 1 ? 'addition' : type === -1 ? 'deletion' : 'unchanged';
            return (
                <span key={index} className={className}>
                    {text}
                </span>
            );
        });
    };

    // Handle version selection for comparison
    const handleVersionSelect = (versionId) => {
        if (selectedVersions.includes(versionId)) {
            setSelectedVersions(selectedVersions.filter(id => id !== versionId));
        } else if (selectedVersions.length < 2) {
            setSelectedVersions([...selectedVersions, versionId]);
        }
    };

    // Toggle version details
    const toggleVersion = (versionId) => {
        const newExpanded = new Set(expandedVersions);
        if (newExpanded.has(versionId)) {
            newExpanded.delete(versionId);
        } else {
            newExpanded.add(versionId);
        }
        setExpandedVersions(newExpanded);
    };

    return (
        <div className="version-history">
            <div className="version-controls">
                {selectedVersions.length === 2 && (
                    <button 
                        onClick={() => onVersionCompare(...selectedVersions)}
                        className="compare-button"
                    >
                        Compare Selected Versions
                    </button>
                )}
            </div>

            <div className="version-list">
                {versions.map((version, index) => (
                    <div 
                        key={version.id}
                        className={`version-item ${version.id === currentVersion ? 'current' : ''}`}
                    >
                        <div className="version-header">
                            <div className="version-info">
                                <input
                                    type="checkbox"
                                    checked={selectedVersions.includes(version.id)}
                                    onChange={() => handleVersionSelect(version.id)}
                                />
                                <span className="version-number">V{versions.length - index}</span>
                                <span className="version-date">
                                    {format(new Date(version.timestamp), 'MMM dd, yyyy HH:mm')}
                                </span>
                                {version.message && (
                                    <span className="version-message">{version.message}</span>
                                )}
                            </div>
                            <div className="version-actions">
                                <button
                                    onClick={() => onVersionSelect(version.id)}
                                    className="view-button"
                                >
                                    View
                                </button>
                                {version.id !== currentVersion && (
                                    <button
                                        onClick={() => onVersionRestore(version.id)}
                                        className="restore-button"
                                    >
                                        Restore
                                    </button>
                                )}
                                <button
                                    onClick={() => toggleVersion(version.id)}
                                    className={`expand-button ${expandedVersions.has(version.id) ? 'expanded' : ''}`}
                                >
                                    {expandedVersions.has(version.id) ? '▼' : '▶'}
                                </button>
                            </div>
                        </div>

                        {expandedVersions.has(version.id) && version.diff && (
                            <div className="version-diff">
                                <div className="diff-content">
                                    {formatDiff(version.diff)}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Styles
const styles = `
.version-history {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
}

.version-controls {
    padding: 12px;
    border-bottom: 1px solid #e0e0e0;
}

.compare-button {
    padding: 6px 12px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.compare-button:hover {
    background: #1976D2;
}

.version-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
}

.version-item {
    margin-bottom: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: #f8f9fa;
}

.version-item.current {
    border-color: #2196F3;
    background: #E3F2FD;
}

.version-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
}

.version-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.version-number {
    font-weight: 600;
    color: #1976D2;
}

.version-date {
    color: #666;
    font-size: 14px;
}

.version-message {
    color: #333;
    font-size: 14px;
}

.version-actions {
    display: flex;
    gap: 8px;
}

.view-button,
.restore-button,
.expand-button {
    padding: 4px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 13px;
    color: #333;
}

.view-button:hover,
.restore-button:hover {
    background: #f5f5f5;
    border-color: #ccc;
}

.restore-button {
    color: #2196F3;
}

.expand-button {
    padding: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.expand-button.expanded {
    background: #f5f5f5;
}

.version-diff {
    padding: 12px;
    border-top: 1px solid #e0e0e0;
    background: white;
}

.diff-content {
    font-family: 'SF Mono', Consolas, 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-x: auto;
}

.addition {
    background-color: #E8F5E9;
    color: #2E7D32;
}

.deletion {
    background-color: #FFEBEE;
    color: #C62828;
    text-decoration: line-through;
}

.unchanged {
    color: #666;
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

module.exports = VersionHistory;
