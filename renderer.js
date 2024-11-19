// Document structure management
class DocumentStructure {
    constructor() {
        this.currentNumberingScheme = '1.2.3.4';
        this.sections = [];
    }

    addSection(title, level, parentId = null) {
        const section = {
            id: Date.now().toString(),
            title,
            level,
            parentId,
            content: '',
            children: []
        };

        if (parentId === null) {
            this.sections.push(section);
        } else {
            this.addToParent(this.sections, parentId, section);
        }

        this.updateNumbering();
        return section.id;
    }

    addToParent(sections, parentId, newSection) {
        for (let section of sections) {
            if (section.id === parentId) {
                section.children.push(newSection);
                return true;
            }
            if (section.children.length > 0) {
                if (this.addToParent(section.children, parentId, newSection)) {
                    return true;
                }
            }
        }
        return false;
    }

    moveSection(sectionId, newParentId, position) {
        const section = this.removeSection(sectionId);
        if (section) {
            if (newParentId === null) {
                this.sections.splice(position, 0, section);
            } else {
                this.addToParent(this.sections, newParentId, section);
            }
            this.updateNumbering();
        }
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

        const section = remove(this.sections);
        if (section) {
            this.updateNumbering();
        }
        return section;
    }

    updateNumbering() {
        const update = (sections, prefix = '') => {
            sections.forEach((section, index) => {
                switch (this.currentNumberingScheme) {
                    case '1.2.3.4':
                        section.number = prefix + (index + 1);
                        break;
                    case 'A.B.C.D':
                        section.number = prefix + String.fromCharCode(65 + index);
                        break;
                    case 'I.II.III.IV':
                        section.number = prefix + this.toRoman(index + 1);
                        break;
                }
                if (section.children.length > 0) {
                    update(section.children, section.number + '.');
                }
            });
        };

        update(this.sections);
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
}

// Initialize document structure
const docStructure = new DocumentStructure();

// UI Event Handlers
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = e.target.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            if (targetTab === 'editor') {
                document.getElementById('editorContainer').style.display = 'block';
                document.getElementById('previewContainer').style.display = 'none';
            } else {
                document.getElementById('editorContainer').style.display = 'none';
                document.getElementById('previewContainer').style.display = 'block';
            }
        });
    });

    // AI Chat
    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatMessages = document.getElementById('chatMessages');
    const minimizeChat = document.querySelector('.minimize-chat');

    sendMessage.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (message) {
            // Add user message to chat
            appendMessage('user', message);
            chatInput.value = '';

            // TODO: Implement AI response
            // For now, just echo the message
            setTimeout(() => {
                appendMessage('ai', `Echo: ${message}`);
            }, 1000);
        }
    });

    minimizeChat.addEventListener('click', () => {
        const chat = document.querySelector('.ai-chat');
        chat.classList.toggle('minimized');
    });

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

// IPC Communication with main process
const { ipcRenderer } = require('electron');

async function saveDocument(document) {
    try {
        await ipcRenderer.invoke('save-document', document);
    } catch (error) {
        console.error('Error saving document:', error);
    }
}

async function loadDocument(documentId) {
    try {
        const document = await ipcRenderer.invoke('load-document', documentId);
        return document;
    } catch (error) {
        console.error('Error loading document:', error);
        return null;
    }
}

async function exportDocument(document, format) {
    try {
        await ipcRenderer.invoke('export-document', { document, format });
    } catch (error) {
        console.error('Error exporting document:', error);
    }
}
