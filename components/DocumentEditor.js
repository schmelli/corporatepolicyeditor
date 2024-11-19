const React = require('react');
const MonacoEditor = require('@monaco-editor/react').default;
const { marked } = require('marked');
const DOMPurify = require('dompurify');
const textAnalysisService = require('../services/textAnalysisService');

const DocumentEditor = ({
    content,
    onChange,
    section,
    onUpdateGlossary,
    glossaryTerms,
    previewMode
}) => {
    const [editorContent, setEditorContent] = React.useState(content);
    const [suggestions, setSuggestions] = React.useState([]);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [highlightedTerms, setHighlightedTerms] = React.useState(new Set());
    const editorRef = React.useRef(null);
    const previewRef = React.useRef(null);
    const debounceTimeout = React.useRef(null);

    // Monaco editor options
    const editorOptions = {
        minimap: { enabled: false },
        lineNumbers: 'on',
        wordWrap: 'on',
        wrappingIndent: 'same',
        fontSize: 14,
        fontFamily: "'SF Mono', Consolas, 'Courier New', monospace",
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        snippetSuggestions: 'on',
        rulers: [80],
        bracketPairColorization: { enabled: true }
    };

    // Handle editor content changes
    const handleEditorChange = (value) => {
        setEditorContent(value);
        
        // Debounce content analysis
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            analyzeContent(value);
            onChange(value);
        }, 500);
    };

    // Analyze content for suggestions and glossary terms
    const analyzeContent = async (text) => {
        setIsAnalyzing(true);
        try {
            const analysis = await textAnalysisService.analyzeText(text, Array.from(glossaryTerms.keys()));
            setSuggestions(analysis.suggestions);
            
            // Update glossary terms
            const newTerms = analysis.glossaryTerms;
            if (newTerms.length > 0) {
                onUpdateGlossary(newTerms);
            }

            // Update highlighted terms
            setHighlightedTerms(new Set([...analysis.technicalTerms]));
        } catch (error) {
            console.error('Error analyzing text:', error);
        }
        setIsAnalyzing(false);
    };

    // Convert markdown to HTML for preview
    const renderPreview = () => {
        if (!editorContent) return '';

        let html = marked(editorContent);
        
        // Highlight glossary terms
        glossaryTerms.forEach((definition, term) => {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            html = html.replace(regex, `<span class="glossary-term" title="${definition}">$&</span>`);
        });

        // Highlight technical terms
        highlightedTerms.forEach(term => {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            html = html.replace(regex, `<span class="technical-term">$&</span>`);
        });

        return DOMPurify.sanitize(html);
    };

    // Editor decorations for real-time feedback
    React.useEffect(() => {
        if (editorRef.current) {
            const editor = editorRef.current;
            const model = editor.getModel();

            if (!model) return;

            const decorations = [];

            // Add decorations for suggestions
            suggestions.forEach(suggestion => {
                if (suggestion.sentence) {
                    const match = model.findMatches(suggestion.sentence, false, false, true, null, true);
                    match.forEach(m => {
                        decorations.push({
                            range: m.range,
                            options: {
                                inlineClassName: `suggestion-${suggestion.type}`,
                                hoverMessage: { value: suggestion.suggestion }
                            }
                        });
                    });
                }
            });

            // Add decorations for glossary terms
            glossaryTerms.forEach((definition, term) => {
                const match = model.findMatches(`\\b${term}\\b`, true, false, true, null, true);
                match.forEach(m => {
                    decorations.push({
                        range: m.range,
                        options: {
                            inlineClassName: 'glossary-term',
                            hoverMessage: { value: definition }
                        }
                    });
                });
            });

            editor.deltaDecorations([], decorations);
        }
    }, [suggestions, glossaryTerms, highlightedTerms]);

    return (
        <div className="document-editor">
            {!previewMode ? (
                <MonacoEditor
                    height="100%"
                    language="markdown"
                    value={editorContent}
                    options={editorOptions}
                    onChange={handleEditorChange}
                    onMount={(editor) => {
                        editorRef.current = editor;
                    }}
                />
            ) : (
                <div 
                    ref={previewRef}
                    className="preview-container"
                    dangerouslySetInnerHTML={{ __html: renderPreview() }}
                />
            )}
            
            {isAnalyzing && (
                <div className="analysis-indicator">
                    Analyzing content...
                </div>
            )}
            
            {suggestions.length > 0 && !previewMode && (
                <div className="suggestions-panel">
                    <h3>Suggestions</h3>
                    <ul>
                        {suggestions.map((suggestion, index) => (
                            <li key={index} className={`suggestion-${suggestion.type}`}>
                                {suggestion.suggestion}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// Styles
const styles = `
.document-editor {
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
}

.preview-container {
    height: 100%;
    padding: 20px;
    overflow-y: auto;
    background: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
}

.preview-container h1,
.preview-container h2,
.preview-container h3,
.preview-container h4,
.preview-container h5,
.preview-container h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
}

.preview-container p {
    margin: 1em 0;
}

.glossary-term {
    color: #2196F3;
    border-bottom: 1px dashed #2196F3;
    cursor: help;
}

.technical-term {
    color: #9C27B0;
    font-weight: 500;
}

.suggestion-style {
    background-color: rgba(255, 152, 0, 0.1);
    border-bottom: 2px wavy #FF9800;
}

.suggestion-readability {
    background-color: rgba(244, 67, 54, 0.1);
    border-bottom: 2px wavy #F44336;
}

.suggestion-vocabulary {
    background-color: rgba(156, 39, 176, 0.1);
    border-bottom: 2px wavy #9C27B0;
}

.analysis-indicator {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.suggestions-panel {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 300px;
    max-height: 200px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    margin: 8px;
    overflow-y: auto;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.suggestions-panel h3 {
    margin: 0;
    padding: 8px 12px;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    font-size: 14px;
}

.suggestions-panel ul {
    list-style: none;
    margin: 0;
    padding: 0;
}

.suggestions-panel li {
    padding: 8px 12px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 13px;
}

.suggestions-panel li:last-child {
    border-bottom: none;
}
`;

// Create and inject styles
const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

module.exports = DocumentEditor;
