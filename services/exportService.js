const docx = require('docx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const marked = require('marked');

class ExportService {
    constructor() {
        this.formats = {
            'docx': this.exportToWord,
            'pdf': this.exportToPDF,
            'md': this.exportToMarkdown,
            'tex': this.exportToLaTeX
        };
    }

    async export(document, format, outputPath) {
        if (this.formats[format]) {
            return await this.formats[format].call(this, document, outputPath);
        }
        throw new Error(`Unsupported format: ${format}`);
    }

    async exportToWord(document, outputPath) {
        const doc = new docx.Document({
            sections: [{
                properties: {},
                children: this.generateWordContent(document)
            }]
        });

        const buffer = await docx.Packer.toBuffer(doc);
        fs.writeFileSync(outputPath, buffer);
    }

    generateWordContent(document) {
        const content = [];

        // Add title
        content.push(new docx.Paragraph({
            text: document.title,
            heading: docx.HeadingLevel.TITLE,
            spacing: { after: 400 }
        }));

        // Add table of contents
        content.push(new docx.TableOfContents("Table of Contents", {
            hyperlink: true,
            headingStyleRange: "1-5"
        }));

        // Add sections recursively
        this.addWordSections(document.sections, content);

        // Add glossary if exists
        if (document.glossary && document.glossary.length > 0) {
            content.push(new docx.Paragraph({
                text: "Glossary",
                heading: docx.HeadingLevel.HEADING_1,
                pageBreakBefore: true
            }));

            document.glossary.forEach(term => {
                content.push(
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun({
                                text: term.term,
                                bold: true
                            }),
                            new docx.TextRun({
                                text: `: ${term.definition}`
                            })
                        ]
                    })
                );
            });
        }

        return content;
    }

    addWordSections(sections, content, level = 1) {
        sections.forEach(section => {
            content.push(new docx.Paragraph({
                text: `${section.number} ${section.title}`,
                heading: level <= 5 ? level : undefined,
                spacing: { before: 240, after: 120 }
            }));

            if (section.content) {
                content.push(new docx.Paragraph({
                    text: section.content
                }));
            }

            if (section.children.length > 0) {
                this.addWordSections(section.children, content, level + 1);
            }
        });
    }

    async exportToPDF(document, outputPath) {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // Add title
        doc.fontSize(24).text(document.title, { align: 'center' });
        doc.moveDown(2);

        // Add table of contents
        doc.fontSize(18).text('Table of Contents');
        doc.moveDown();
        this.addPDFTableOfContents(doc, document.sections);
        doc.addPage();

        // Add sections
        this.addPDFSections(doc, document.sections);

        // Add glossary
        if (document.glossary && document.glossary.length > 0) {
            doc.addPage();
            doc.fontSize(18).text('Glossary');
            doc.moveDown();

            document.glossary.forEach(term => {
                doc.fontSize(12)
                    .text(term.term, { continued: true, bold: true })
                    .text(`: ${term.definition}`);
                doc.moveDown(0.5);
            });
        }

        doc.end();
        return new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    }

    addPDFTableOfContents(doc, sections, level = 0) {
        sections.forEach(section => {
            doc.fontSize(12)
                .text(
                    `${' '.repeat(level * 4)}${section.number} ${section.title}`,
                    { link: section.number }
                );
            
            if (section.children.length > 0) {
                this.addPDFTableOfContents(doc, section.children, level + 1);
            }
        });
    }

    addPDFSections(doc, sections) {
        sections.forEach(section => {
            doc.fontSize(14)
                .text(`${section.number} ${section.title}`, {
                    destination: section.number
                });
            doc.moveDown();

            if (section.content) {
                doc.fontSize(12).text(section.content);
                doc.moveDown();
            }

            if (section.children.length > 0) {
                this.addPDFSections(doc, section.children);
            }
        });
    }

    async exportToMarkdown(document, outputPath) {
        let content = `# ${document.title}\n\n`;
        content += '## Table of Contents\n';
        content += this.generateMarkdownTOC(document.sections);
        content += '\n---\n\n';
        content += this.generateMarkdownSections(document.sections);

        if (document.glossary && document.glossary.length > 0) {
            content += '\n## Glossary\n\n';
            document.glossary.forEach(term => {
                content += `**${term.term}**: ${term.definition}\n\n`;
            });
        }

        fs.writeFileSync(outputPath, content);
    }

    generateMarkdownTOC(sections, level = 0) {
        let toc = '';
        sections.forEach(section => {
            toc += `${' '.repeat(level * 2)}- [${section.number} ${section.title}](#${section.number.toLowerCase().replace(/\./g, '')})\n`;
            if (section.children.length > 0) {
                toc += this.generateMarkdownTOC(section.children, level + 1);
            }
        });
        return toc;
    }

    generateMarkdownSections(sections) {
        let content = '';
        sections.forEach(section => {
            const headerLevel = section.number.split('.').length;
            content += `${'#'.repeat(headerLevel)} ${section.number} ${section.title}\n\n`;
            
            if (section.content) {
                content += `${section.content}\n\n`;
            }

            if (section.children.length > 0) {
                content += this.generateMarkdownSections(section.children);
            }
        });
        return content;
    }

    async exportToLaTeX(document, outputPath) {
        let content = `\\documentclass{article}\n`;
        content += `\\usepackage[utf8]{inputenc}\n`;
        content += `\\usepackage{hyperref}\n`;
        content += `\\title{${this.escapeLatex(document.title)}}\n`;
        content += `\\begin{document}\n\n`;
        content += `\\maketitle\n\n`;
        content += `\\tableofcontents\n\n`;
        content += `\\newpage\n\n`;
        content += this.generateLaTeXSections(document.sections);

        if (document.glossary && document.glossary.length > 0) {
            content += `\\section*{Glossary}\n\n`;
            content += `\\begin{description}\n`;
            document.glossary.forEach(term => {
                content += `\\item[${this.escapeLatex(term.term)}] ${this.escapeLatex(term.definition)}\n`;
            });
            content += `\\end{description}\n\n`;
        }

        content += `\\end{document}`;

        fs.writeFileSync(outputPath, content);
    }

    generateLaTeXSections(sections) {
        let content = '';
        sections.forEach(section => {
            const level = section.number.split('.').length;
            const sectionCmd = this.getLaTeXSectionCommand(level);
            
            content += `\\${sectionCmd}{${this.escapeLatex(section.number)} ${this.escapeLatex(section.title)}}\n\n`;
            
            if (section.content) {
                content += `${this.escapeLatex(section.content)}\n\n`;
            }

            if (section.children.length > 0) {
                content += this.generateLaTeXSections(section.children);
            }
        });
        return content;
    }

    getLaTeXSectionCommand(level) {
        const commands = ['section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph'];
        return commands[Math.min(level - 1, commands.length - 1)];
    }

    escapeLatex(text) {
        return text
            .replace(/\\/g, '\\textbackslash{}')
            .replace(/[&%$#_{}]/g, '\\$&')
            .replace(/\^/g, '\\textasciicircum{}')
            .replace(/~/g, '\\textasciitilde{}');
    }
}

module.exports = new ExportService();
