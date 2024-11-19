const WebSocket = require('ws');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { diff_match_patch: DiffMatchPatch } = require('diff-match-patch');

class CollaborationService extends EventEmitter {
    constructor(server) {
        super();
        this.wss = new WebSocket.Server({ server });
        this.documents = new Map();
        this.clients = new Map();
        this.cursors = new Map();
        this.diffTool = new DiffMatchPatch();
        this.initialize();
    }

    // Initialize WebSocket server
    initialize() {
        this.wss.on('connection', (ws) => {
            const clientId = uuidv4();
            this.clients.set(ws, clientId);

            ws.on('message', (message) => {
                this.handleMessage(ws, JSON.parse(message));
            });

            ws.on('close', () => {
                this.handleClientDisconnect(ws);
            });

            // Send initial connection acknowledgment
            ws.send(JSON.stringify({
                type: 'connected',
                clientId
            }));
        });
    }

    // Handle incoming messages
    handleMessage(ws, message) {
        switch (message.type) {
            case 'join':
                this.handleJoin(ws, message);
                break;
            case 'change':
                this.handleChange(ws, message);
                break;
            case 'cursor':
                this.handleCursor(ws, message);
                break;
            case 'selection':
                this.handleSelection(ws, message);
                break;
            case 'comment':
                this.handleComment(ws, message);
                break;
            case 'sync':
                this.handleSync(ws, message);
                break;
        }
    }

    // Handle client joining a document
    handleJoin(ws, { documentId, username }) {
        const clientId = this.clients.get(ws);
        
        if (!this.documents.has(documentId)) {
            this.documents.set(documentId, {
                clients: new Set(),
                content: '',
                version: 0,
                comments: [],
                selections: new Map()
            });
        }

        const doc = this.documents.get(documentId);
        doc.clients.add(clientId);

        // Notify other clients
        this.broadcast(documentId, {
            type: 'user-joined',
            clientId,
            username
        }, [clientId]);

        // Send current document state
        ws.send(JSON.stringify({
            type: 'document',
            content: doc.content,
            version: doc.version,
            comments: doc.comments,
            cursors: Array.from(this.cursors.entries()),
            selections: Array.from(doc.selections.entries())
        }));
    }

    // Handle document changes
    handleChange(ws, { documentId, changes, version }) {
        const doc = this.documents.get(documentId);
        const clientId = this.clients.get(ws);

        if (!doc || doc.version !== version) {
            // Request sync if versions don't match
            ws.send(JSON.stringify({
                type: 'sync-required',
                currentVersion: doc?.version
            }));
            return;
        }

        // Apply changes
        const patches = this.diffTool.patch_fromText(changes);
        const [newContent] = this.diffTool.patch_apply(patches, doc.content);
        
        doc.content = newContent;
        doc.version++;

        // Broadcast changes to other clients
        this.broadcast(documentId, {
            type: 'change',
            changes,
            version: doc.version,
            clientId
        }, [clientId]);
    }

    // Handle cursor position updates
    handleCursor(ws, { documentId, position }) {
        const clientId = this.clients.get(ws);
        this.cursors.set(clientId, position);

        this.broadcast(documentId, {
            type: 'cursor',
            clientId,
            position
        }, [clientId]);
    }

    // Handle text selection
    handleSelection(ws, { documentId, range }) {
        const clientId = this.clients.get(ws);
        const doc = this.documents.get(documentId);
        
        if (range) {
            doc.selections.set(clientId, range);
        } else {
            doc.selections.delete(clientId);
        }

        this.broadcast(documentId, {
            type: 'selection',
            clientId,
            range
        }, [clientId]);
    }

    // Handle comments
    handleComment(ws, { documentId, comment }) {
        const clientId = this.clients.get(ws);
        const doc = this.documents.get(documentId);
        
        comment.id = uuidv4();
        comment.clientId = clientId;
        comment.timestamp = new Date();
        
        doc.comments.push(comment);

        this.broadcast(documentId, {
            type: 'comment',
            comment
        });
    }

    // Handle sync requests
    handleSync(ws, { documentId }) {
        const doc = this.documents.get(documentId);
        
        if (doc) {
            ws.send(JSON.stringify({
                type: 'sync',
                content: doc.content,
                version: doc.version,
                comments: doc.comments,
                cursors: Array.from(this.cursors.entries()),
                selections: Array.from(doc.selections.entries())
            }));
        }
    }

    // Handle client disconnection
    handleClientDisconnect(ws) {
        const clientId = this.clients.get(ws);
        
        // Clean up client data
        this.clients.delete(ws);
        this.cursors.delete(clientId);

        // Remove client from all documents
        for (const [documentId, doc] of this.documents.entries()) {
            if (doc.clients.has(clientId)) {
                doc.clients.delete(clientId);
                doc.selections.delete(clientId);

                // Notify other clients
                this.broadcast(documentId, {
                    type: 'user-left',
                    clientId
                });
            }
        }
    }

    // Broadcast message to all clients in a document
    broadcast(documentId, message, excludeIds = []) {
        const doc = this.documents.get(documentId);
        if (!doc) return;

        for (const [ws, clientId] of this.clients.entries()) {
            if (doc.clients.has(clientId) && !excludeIds.includes(clientId)) {
                ws.send(JSON.stringify(message));
            }
        }
    }

    // Get document statistics
    getDocumentStats(documentId) {
        const doc = this.documents.get(documentId);
        if (!doc) return null;

        return {
            activeUsers: doc.clients.size,
            version: doc.version,
            commentCount: doc.comments.length,
            lastModified: new Date()
        };
    }

    // Get active users in a document
    getActiveUsers(documentId) {
        const doc = this.documents.get(documentId);
        if (!doc) return [];

        return Array.from(doc.clients);
    }

    // Get document comments
    getComments(documentId) {
        const doc = this.documents.get(documentId);
        if (!doc) return [];

        return doc.comments;
    }

    // Add comment to a document
    addComment(documentId, comment) {
        const doc = this.documents.get(documentId);
        if (!doc) return null;

        comment.id = uuidv4();
        comment.timestamp = new Date();
        doc.comments.push(comment);

        this.broadcast(documentId, {
            type: 'comment',
            comment
        });

        return comment;
    }

    // Remove comment from a document
    removeComment(documentId, commentId) {
        const doc = this.documents.get(documentId);
        if (!doc) return false;

        const index = doc.comments.findIndex(c => c.id === commentId);
        if (index === -1) return false;

        doc.comments.splice(index, 1);

        this.broadcast(documentId, {
            type: 'comment-removed',
            commentId
        });

        return true;
    }

    // Lock section for editing
    lockSection(documentId, sectionId, clientId) {
        const doc = this.documents.get(documentId);
        if (!doc) return false;

        if (!doc.locks) doc.locks = new Map();

        // Check if section is already locked
        if (doc.locks.has(sectionId)) {
            return false;
        }

        doc.locks.set(sectionId, {
            clientId,
            timestamp: Date.now()
        });

        this.broadcast(documentId, {
            type: 'section-locked',
            sectionId,
            clientId
        });

        return true;
    }

    // Unlock section
    unlockSection(documentId, sectionId, clientId) {
        const doc = this.documents.get(documentId);
        if (!doc || !doc.locks) return false;

        const lock = doc.locks.get(sectionId);
        if (!lock || lock.clientId !== clientId) {
            return false;
        }

        doc.locks.delete(sectionId);

        this.broadcast(documentId, {
            type: 'section-unlocked',
            sectionId
        });

        return true;
    }
}

module.exports = CollaborationService;
