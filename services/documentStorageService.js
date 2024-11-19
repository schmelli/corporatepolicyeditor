const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { diff_match_patch: DiffMatchPatch } = require('diff-match-patch');
const { createHash } = require('crypto');

class DocumentStorageService {
    constructor(baseDir) {
        this.baseDir = baseDir;
        this.documentsDir = path.join(baseDir, 'documents');
        this.versionsDir = path.join(baseDir, 'versions');
        this.metadataDir = path.join(baseDir, 'metadata');
        this.lockFile = path.join(baseDir, 'locks.json');
        this.diffTool = new DiffMatchPatch();
        this.initialize();
    }

    // Initialize storage directories
    async initialize() {
        try {
            await fs.mkdir(this.baseDir, { recursive: true });
            await fs.mkdir(this.documentsDir, { recursive: true });
            await fs.mkdir(this.versionsDir, { recursive: true });
            await fs.mkdir(this.metadataDir, { recursive: true });
            
            // Initialize locks file if it doesn't exist
            try {
                await fs.access(this.lockFile);
            } catch {
                await fs.writeFile(this.lockFile, JSON.stringify({}));
            }
        } catch (error) {
            console.error('Failed to initialize storage:', error);
            throw error;
        }
    }

    // Generate document hash for version control
    generateHash(content) {
        return createHash('sha256').update(JSON.stringify(content)).digest('hex');
    }

    // Create a new document
    async createDocument(document) {
        const docId = uuidv4();
        const timestamp = new Date().toISOString();
        const versionId = uuidv4();
        
        const metadata = {
            id: docId,
            title: document.title,
            created: timestamp,
            modified: timestamp,
            currentVersion: versionId,
            versions: [{
                id: versionId,
                timestamp,
                hash: this.generateHash(document),
                message: 'Initial version'
            }],
            contributors: document.metadata?.contributors || [],
            tags: document.metadata?.tags || []
        };

        try {
            // Save document content
            await fs.writeFile(
                path.join(this.documentsDir, `${docId}.json`),
                JSON.stringify(document, null, 2)
            );

            // Save initial version
            await fs.writeFile(
                path.join(this.versionsDir, `${versionId}.json`),
                JSON.stringify({ document, parent: null })
            );

            // Save metadata
            await fs.writeFile(
                path.join(this.metadataDir, `${docId}.json`),
                JSON.stringify(metadata, null, 2)
            );

            return { docId, versionId, metadata };
        } catch (error) {
            console.error('Failed to create document:', error);
            throw error;
        }
    }

    // Save a new version of a document
    async saveVersion(docId, document, message = '') {
        const lock = await this.acquireLock(docId);
        if (!lock) throw new Error('Document is locked by another user');

        try {
            const metadata = await this.getMetadata(docId);
            const currentVersion = await this.getVersion(metadata.currentVersion);
            const newContent = JSON.stringify(document);
            const currentContent = JSON.stringify(currentVersion.document);

            // Generate diff
            const diff = this.diffTool.patch_make(currentContent, newContent);
            const hash = this.generateHash(document);

            // Check if there are actual changes
            if (hash === metadata.versions[metadata.versions.length - 1].hash) {
                return { versionId: metadata.currentVersion, metadata };
            }

            const versionId = uuidv4();
            const timestamp = new Date().toISOString();

            // Save new version
            await fs.writeFile(
                path.join(this.versionsDir, `${versionId}.json`),
                JSON.stringify({
                    document,
                    parent: metadata.currentVersion,
                    diff: diff
                })
            );

            // Update document content
            await fs.writeFile(
                path.join(this.documentsDir, `${docId}.json`),
                JSON.stringify(document, null, 2)
            );

            // Update metadata
            metadata.modified = timestamp;
            metadata.currentVersion = versionId;
            metadata.versions.push({
                id: versionId,
                timestamp,
                hash,
                message
            });

            await fs.writeFile(
                path.join(this.metadataDir, `${docId}.json`),
                JSON.stringify(metadata, null, 2)
            );

            return { versionId, metadata };
        } finally {
            await this.releaseLock(docId);
        }
    }

    // Get a specific version of a document
    async getVersion(versionId) {
        try {
            const versionPath = path.join(this.versionsDir, `${versionId}.json`);
            const versionData = JSON.parse(await fs.readFile(versionPath, 'utf8'));
            return versionData;
        } catch (error) {
            console.error('Failed to get version:', error);
            throw error;
        }
    }

    // Get document metadata
    async getMetadata(docId) {
        try {
            const metadataPath = path.join(this.metadataDir, `${docId}.json`);
            return JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        } catch (error) {
            console.error('Failed to get metadata:', error);
            throw error;
        }
    }

    // Get current document content
    async getDocument(docId) {
        try {
            const docPath = path.join(this.documentsDir, `${docId}.json`);
            return JSON.parse(await fs.readFile(docPath, 'utf8'));
        } catch (error) {
            console.error('Failed to get document:', error);
            throw error;
        }
    }

    // List all documents
    async listDocuments() {
        try {
            const files = await fs.readdir(this.metadataDir);
            const documents = await Promise.all(
                files.map(async file => {
                    const metadata = JSON.parse(
                        await fs.readFile(path.join(this.metadataDir, file), 'utf8')
                    );
                    return {
                        id: metadata.id,
                        title: metadata.title,
                        modified: metadata.modified,
                        created: metadata.created,
                        versions: metadata.versions.length
                    };
                })
            );
            return documents;
        } catch (error) {
            console.error('Failed to list documents:', error);
            throw error;
        }
    }

    // Restore a specific version
    async restoreVersion(docId, versionId) {
        const lock = await this.acquireLock(docId);
        if (!lock) throw new Error('Document is locked by another user');

        try {
            const version = await this.getVersion(versionId);
            const metadata = await this.getMetadata(docId);
            const newVersionId = uuidv4();
            const timestamp = new Date().toISOString();

            // Save as new version
            await fs.writeFile(
                path.join(this.versionsDir, `${newVersionId}.json`),
                JSON.stringify({
                    ...version,
                    parent: metadata.currentVersion
                })
            );

            // Update current document
            await fs.writeFile(
                path.join(this.documentsDir, `${docId}.json`),
                JSON.stringify(version.document, null, 2)
            );

            // Update metadata
            metadata.modified = timestamp;
            metadata.currentVersion = newVersionId;
            metadata.versions.push({
                id: newVersionId,
                timestamp,
                hash: this.generateHash(version.document),
                message: `Restored from version ${versionId}`
            });

            await fs.writeFile(
                path.join(this.metadataDir, `${docId}.json`),
                JSON.stringify(metadata, null, 2)
            );

            return { versionId: newVersionId, metadata };
        } finally {
            await this.releaseLock(docId);
        }
    }

    // Get version history with diffs
    async getVersionHistory(docId) {
        try {
            const metadata = await this.getMetadata(docId);
            const history = [];

            for (let i = metadata.versions.length - 1; i >= 0; i--) {
                const version = metadata.versions[i];
                const versionData = await this.getVersion(version.id);
                
                history.push({
                    ...version,
                    diff: versionData.diff,
                    parent: versionData.parent
                });
            }

            return history;
        } catch (error) {
            console.error('Failed to get version history:', error);
            throw error;
        }
    }

    // Compare two versions
    async compareVersions(versionId1, versionId2) {
        try {
            const version1 = await this.getVersion(versionId1);
            const version2 = await this.getVersion(versionId2);
            
            const diff = this.diffTool.diff_main(
                JSON.stringify(version1.document, null, 2),
                JSON.stringify(version2.document, null, 2)
            );
            this.diffTool.diff_cleanupSemantic(diff);
            
            return diff;
        } catch (error) {
            console.error('Failed to compare versions:', error);
            throw error;
        }
    }

    // Lock management
    async acquireLock(docId, userId = 'default') {
        try {
            const locks = JSON.parse(await fs.readFile(this.lockFile, 'utf8'));
            
            if (locks[docId] && locks[docId].userId !== userId) {
                // Check if lock is stale (older than 5 minutes)
                const lockAge = Date.now() - locks[docId].timestamp;
                if (lockAge < 5 * 60 * 1000) {
                    return false;
                }
            }
            
            locks[docId] = {
                userId,
                timestamp: Date.now()
            };
            
            await fs.writeFile(this.lockFile, JSON.stringify(locks));
            return true;
        } catch (error) {
            console.error('Failed to acquire lock:', error);
            throw error;
        }
    }

    async releaseLock(docId, userId = 'default') {
        try {
            const locks = JSON.parse(await fs.readFile(this.lockFile, 'utf8'));
            
            if (locks[docId] && locks[docId].userId === userId) {
                delete locks[docId];
                await fs.writeFile(this.lockFile, JSON.stringify(locks));
            }
        } catch (error) {
            console.error('Failed to release lock:', error);
            throw error;
        }
    }

    // Search documents
    async searchDocuments(query) {
        try {
            const documents = await this.listDocuments();
            const results = [];

            for (const doc of documents) {
                const content = await this.getDocument(doc.id);
                const metadata = await this.getMetadata(doc.id);

                // Search in title
                const titleMatch = metadata.title.toLowerCase().includes(query.toLowerCase());
                
                // Search in content
                const contentMatch = JSON.stringify(content)
                    .toLowerCase()
                    .includes(query.toLowerCase());
                
                // Search in tags
                const tagMatch = metadata.tags.some(tag => 
                    tag.toLowerCase().includes(query.toLowerCase())
                );

                if (titleMatch || contentMatch || tagMatch) {
                    results.push({
                        ...doc,
                        matchType: {
                            title: titleMatch,
                            content: contentMatch,
                            tags: tagMatch
                        }
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('Failed to search documents:', error);
            throw error;
        }
    }
}

module.exports = DocumentStorageService;
