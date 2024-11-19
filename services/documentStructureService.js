class DocumentStructureService {
    constructor() {
        this.currentDocument = null;
        this.numberingSchemes = {
            'decimal': {
                name: 'Decimal (1.2.3.4)',
                generator: (level, index) => (index + 1).toString()
            },
            'alphaUpper': {
                name: 'Uppercase Letters (A.B.C.D)',
                generator: (level, index) => String.fromCharCode(65 + index)
            },
            'alphaLower': {
                name: 'Lowercase Letters (a.b.c.d)',
                generator: (level, index) => String.fromCharCode(97 + index)
            },
            'roman': {
                name: 'Roman Numerals (I.II.III.IV)',
                generator: (level, index) => this.toRoman(index + 1)
            },
            'hybrid1': {
                name: 'Hybrid (1.A.1.a)',
                generator: (level, index) => {
                    switch (level % 4) {
                        case 0: return (index + 1).toString();
                        case 1: return String.fromCharCode(65 + index);
                        case 2: return (index + 1).toString();
                        case 3: return String.fromCharCode(97 + index);
                    }
                }
            },
            'hybrid2': {
                name: 'Legal (1.1.1.1)',
                generator: (level, index) => (index + 1).toString()
            }
        };
        
        this.currentScheme = 'decimal';
        this.references = new Map(); // Stores all cross-references
        this.glossaryTerms = new Map(); // Stores glossary terms and their occurrences
    }

    createDocument(title) {
        this.currentDocument = {
            id: Date.now().toString(),
            title,
            sections: [],
            references: new Map(),
            glossary: new Map(),
            numberingScheme: this.currentScheme,
            metadata: {
                created: new Date(),
                modified: new Date(),
                version: '1.0'
            }
        };
        return this.currentDocument;
    }

    addSection(title, level = 0, parentId = null, position = -1) {
        const section = {
            id: Date.now().toString(),
            title,
            level,
            content: '',
            children: [],
            references: new Set(),
            glossaryTerms: new Set(),
            metadata: {
                created: new Date(),
                modified: new Date(),
                author: 'Current User' // TODO: Implement user management
            }
        };

        if (!this.currentDocument) {
            throw new Error('No active document');
        }

        if (parentId === null) {
            if (position === -1) {
                this.currentDocument.sections.push(section);
            } else {
                this.currentDocument.sections.splice(position, 0, section);
            }
        } else {
            this.addToParent(this.currentDocument.sections, parentId, section, position);
        }

        this.updateNumbering();
        this.updateReferences();
        return section.id;
    }

    addToParent(sections, parentId, newSection, position = -1) {
        for (let section of sections) {
            if (section.id === parentId) {
                if (position === -1) {
                    section.children.push(newSection);
                } else {
                    section.children.splice(position, 0, newSection);
                }
                return true;
            }
            if (section.children.length > 0) {
                if (this.addToParent(section.children, parentId, newSection, position)) {
                    return true;
                }
            }
        }
        return false;
    }

    moveSection(sectionId, newParentId, position = -1) {
        const section = this.removeSection(sectionId);
        if (!section) return false;

        if (newParentId === null) {
            if (position === -1) {
                this.currentDocument.sections.push(section);
            } else {
                this.currentDocument.sections.splice(position, 0, section);
            }
        } else {
            this.addToParent(this.currentDocument.sections, newParentId, section, position);
        }

        this.updateNumbering();
        this.updateReferences();
        return true;
    }

    removeSection(sectionId) {
        const remove = (sections) => {
            for (let i = 0; i < sections.length; i++) {
                if (sections[i].id === sectionId) {
                    return sections.splice(i, 1)[0];
                }
                if (sections[i].children.length > 0) {
                    const result = remove(sections[i].children);
                    if (result) return result;
                }
            }
            return null;
        };

        const section = remove(this.currentDocument.sections);
        if (section) {
            this.updateNumbering();
            this.updateReferences();
        }
        return section;
    }

    updateNumbering() {
        const scheme = this.numberingSchemes[this.currentDocument.numberingScheme];
        
        const updateSection = (sections, prefix = '', level = 0) => {
            sections.forEach((section, index) => {
                const levelNumber = scheme.generator(level, index);
                section.number = prefix ? `${prefix}.${levelNumber}` : levelNumber;
                
                if (section.children.length > 0) {
                    updateSection(section.children, section.number, level + 1);
                }
            });
        };

        updateSection(this.currentDocument.sections);
    }

    setNumberingScheme(schemeName) {
        if (this.numberingSchemes[schemeName]) {
            this.currentDocument.numberingScheme = schemeName;
            this.updateNumbering();
            this.updateReferences();
        }
    }

    addReference(fromSectionId, toSectionId, referenceType = 'see') {
        const reference = {
            id: Date.now().toString(),
            fromSection: fromSectionId,
            toSection: toSectionId,
            type: referenceType,
            timestamp: new Date()
        };

        this.references.set(reference.id, reference);
        
        // Add to section's references
        const section = this.findSection(fromSectionId);
        if (section) {
            section.references.add(reference.id);
        }

        return reference.id;
    }

    updateReferences() {
        // Update all cross-references in the document
        this.references.forEach((reference) => {
            const fromSection = this.findSection(reference.fromSection);
            const toSection = this.findSection(reference.toSection);
            
            if (fromSection && toSection) {
                // Update reference text in the content
                const refPattern = new RegExp(`\\{ref:${reference.id}\\}`, 'g');
                fromSection.content = fromSection.content.replace(
                    refPattern,
                    `Section ${toSection.number}`
                );
            }
        });
    }

    addGlossaryTerm(term, definition) {
        const termEntry = {
            id: Date.now().toString(),
            term,
            definition,
            occurrences: new Set(),
            created: new Date(),
            modified: new Date()
        };

        this.currentDocument.glossary.set(term.toLowerCase(), termEntry);
        this.updateGlossaryReferences();
        return termEntry.id;
    }

    updateGlossaryReferences() {
        const updateSection = (section) => {
            this.currentDocument.glossary.forEach((entry, term) => {
                const termPattern = new RegExp(`\\b${term}\\b`, 'gi');
                if (termPattern.test(section.content)) {
                    section.glossaryTerms.add(entry.id);
                    entry.occurrences.add(section.id);
                }
            });

            section.children.forEach(updateSection);
        };

        this.currentDocument.sections.forEach(updateSection);
    }

    findSection(sectionId) {
        const find = (sections) => {
            for (let section of sections) {
                if (section.id === sectionId) {
                    return section;
                }
                if (section.children.length > 0) {
                    const result = find(section.children);
                    if (result) return result;
                }
            }
            return null;
        };

        return find(this.currentDocument.sections);
    }

    toRoman(num) {
        const romanNumerals = [
            ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
            ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
            ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
        ];
        
        return romanNumerals.reduce((result, [letter, value]) => {
            while (num >= value) {
                result += letter;
                num -= value;
            }
            return result;
        }, '');
    }

    // Utility method to get document structure as a flat array
    getFlatStructure() {
        const flat = [];
        
        const flatten = (sections, level = 0) => {
            sections.forEach(section => {
                flat.push({
                    id: section.id,
                    number: section.number,
                    title: section.title,
                    level,
                    hasChildren: section.children.length > 0
                });
                
                if (section.children.length > 0) {
                    flatten(section.children, level + 1);
                }
            });
        };

        flatten(this.currentDocument.sections);
        return flat;
    }

    // Get the full path to a section
    getSectionPath(sectionId) {
        const path = [];
        
        const findPath = (sections) => {
            for (let section of sections) {
                path.push(section);
                if (section.id === sectionId) {
                    return true;
                }
                if (section.children.length > 0) {
                    if (findPath(section.children)) {
                        return true;
                    }
                }
                path.pop();
            }
            return false;
        };

        findPath(this.currentDocument.sections);
        return path;
    }
}

module.exports = new DocumentStructureService();
