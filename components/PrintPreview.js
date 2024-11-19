const React = require('react');
const { PDFViewer } = require('@react-pdf/renderer');
const { Document, Page, Text, View, StyleSheet, Font } = require('@react-pdf/renderer');

// Register fonts
Font.register({
    family: 'Roboto',
    fonts: [
        { src: '../assets/fonts/Roboto-Regular.ttf' },
        { src: '../assets/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
        { src: '../assets/fonts/Roboto-Italic.ttf', fontStyle: 'italic' },
        { src: '../assets/fonts/Roboto-BoldItalic.ttf', fontWeight: 'bold', fontStyle: 'italic' }
    ]
});

const styles = StyleSheet.create({
    page: {
        padding: 50,
        fontFamily: 'Roboto'
    },
    header: {
        marginBottom: 20,
        borderBottom: '1pt solid #999',
        paddingBottom: 10
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10
    },
    metadata: {
        fontSize: 10,
        color: '#666',
        marginBottom: 5
    },
    toc: {
        marginTop: 20,
        marginBottom: 30
    },
    tocTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10
    },
    tocItem: {
        fontSize: 12,
        marginBottom: 5,
        flexDirection: 'row',
        alignItems: 'center'
    },
    tocNumber: {
        width: 40,
        marginRight: 10
    },
    tocText: {
        flex: 1
    },
    tocPage: {
        width: 30,
        textAlign: 'right'
    },
    tocDots: {
        flex: 1,
        borderBottom: '1pt dotted #999',
        marginLeft: 5,
        marginRight: 5
    },
    section: {
        marginBottom: 15
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10
    },
    content: {
        fontSize: 12,
        lineHeight: 1.6
    },
    glossary: {
        marginTop: 30,
        borderTop: '1pt solid #999',
        paddingTop: 20
    },
    glossaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 15
    },
    glossaryItem: {
        marginBottom: 10
    },
    glossaryTerm: {
        fontSize: 12,
        fontWeight: 'bold'
    },
    glossaryDefinition: {
        fontSize: 12,
        marginLeft: 20
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 10,
        color: '#666'
    },
    pageNumber: {
        position: 'absolute',
        bottom: 30,
        right: 50,
        fontSize: 10,
        color: '#666'
    }
});

const PrintPreview = ({ document }) => {
    const renderTableOfContents = () => (
        <View style={styles.toc}>
            <Text style={styles.tocTitle}>Table of Contents</Text>
            {document.sections.map((section, index) => (
                <View key={section.id} style={styles.tocItem}>
                    <Text style={styles.tocNumber}>{section.number}</Text>
                    <Text style={styles.tocText}>{section.title}</Text>
                    <View style={styles.tocDots} />
                    <Text style={styles.tocPage}>{index + 1}</Text>
                </View>
            ))}
        </View>
    );

    const renderSection = (section, level = 0) => (
        <View key={section.id} style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: 16 - level * 2 }]}>
                {section.number} {section.title}
            </Text>
            <Text style={styles.content}>{section.content}</Text>
            {section.children.map(child => renderSection(child, level + 1))}
        </View>
    );

    const renderGlossary = () => (
        <View style={styles.glossary}>
            <Text style={styles.glossaryTitle}>Glossary</Text>
            {Array.from(document.glossary.entries()).map(([term, entry]) => (
                <View key={entry.id} style={styles.glossaryItem}>
                    <Text style={styles.glossaryTerm}>{term}</Text>
                    <Text style={styles.glossaryDefinition}>{entry.definition}</Text>
                </View>
            ))}
        </View>
    );

    return (
        <PDFViewer style={{ width: '100%', height: '100%' }}>
            <Document>
                <Page size="A4" style={styles.page}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{document.title}</Text>
                        <Text style={styles.metadata}>
                            Created: {document.metadata.created.toLocaleDateString()}
                            {' | '}
                            Version: {document.metadata.version}
                        </Text>
                    </View>

                    {renderTableOfContents()}

                    {document.sections.map(section => renderSection(section))}

                    {document.glossary.size > 0 && renderGlossary()}

                    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
                        `${pageNumber} / ${totalPages}`
                    )} fixed />
                </Page>
            </Document>
        </PDFViewer>
    );
};

// Print preview toolbar component
const PrintPreviewToolbar = ({ onPrint, onExport, onClose }) => {
    return (
        <div className="print-preview-toolbar">
            <button onClick={onPrint} className="toolbar-button">
                <span className="icon">🖨️</span>
                Print
            </button>
            <button onClick={onExport} className="toolbar-button">
                <span className="icon">💾</span>
                Export
            </button>
            <button onClick={onClose} className="toolbar-button">
                <span className="icon">✖️</span>
                Close
            </button>
        </div>
    );
};

// Inject styles for the toolbar
const toolbarStyles = `
.print-preview-toolbar {
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 0 0 4px 4px;
    padding: 8px;
    display: flex;
    gap: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 1000;
}

.toolbar-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 14px;
    color: #333;
    transition: all 0.2s;
}

.toolbar-button:hover {
    background: #f5f5f5;
    border-color: #ccc;
}

.toolbar-button .icon {
    font-size: 16px;
}
`;

const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = toolbarStyles;
document.head.appendChild(styleSheet);

module.exports = { PrintPreview, PrintPreviewToolbar };
