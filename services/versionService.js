const { v4: uuidv4 } = require('uuid');
const { diff_match_patch: DiffMatchPatch } = require('diff-match-patch');
const { EventEmitter } = require('events');
const crypto = require('crypto');

class VersionService extends EventEmitter {
    constructor() {
        super();
        this.versions = new Map();
        this.branches = new Map();
        this.tags = new Map();
        this.diffTool = new DiffMatchPatch();
    }

    // Initialize a new document version tree
    initializeDocument(documentId, initialContent = '') {
        const version = {
            id: uuidv4(),
            content: initialContent,
            hash: this.generateHash(initialContent),
            timestamp: new Date(),
            parent: null,
            children: [],
            metadata: {
                author: 'system',
                message: 'Initial version'
            }
        };

        this.versions.set(documentId, new Map([[version.id, version]]));
        this.branches.set(documentId, new Map([['main', version.id]]));
        return version;
    }

    // Create a new version
    createVersion(documentId, content, metadata = {}) {
        const versions = this.versions.get(documentId);
        if (!versions) throw new Error('Document not found');

        const currentBranch = this.getCurrentBranch(documentId);
        const parentVersion = versions.get(currentBranch);

        const version = {
            id: uuidv4(),
            content,
            hash: this.generateHash(content),
            timestamp: new Date(),
            parent: parentVersion.id,
            children: [],
            metadata: {
                ...metadata,
                timestamp: new Date()
            }
        };

        // Update parent's children
        parentVersion.children.push(version.id);

        // Store new version
        versions.set(version.id, version);

        // Update branch pointer
        this.branches.get(documentId).set(this.getCurrentBranchName(documentId), version.id);

        this.emit('version-created', {
            documentId,
            versionId: version.id,
            metadata
        });

        return version;
    }

    // Create a new branch
    createBranch(documentId, branchName, startingVersionId) {
        const versions = this.versions.get(documentId);
        if (!versions) throw new Error('Document not found');

        const branches = this.branches.get(documentId);
        if (branches.has(branchName)) {
            throw new Error('Branch already exists');
        }

        if (!versions.has(startingVersionId)) {
            throw new Error('Starting version not found');
        }

        branches.set(branchName, startingVersionId);

        this.emit('branch-created', {
            documentId,
            branchName,
            startingVersionId
        });

        return true;
    }

    // Switch to a different branch
    switchBranch(documentId, branchName) {
        const branches = this.branches.get(documentId);
        if (!branches || !branches.has(branchName)) {
            throw new Error('Branch not found');
        }

        this.emit('branch-switched', {
            documentId,
            branchName
        });

        return branches.get(branchName);
    }

    // Merge two branches
    async mergeBranches(documentId, sourceBranch, targetBranch, resolution = 'auto') {
        const versions = this.versions.get(documentId);
        const branches = this.branches.get(documentId);

        if (!versions || !branches) throw new Error('Document not found');
        if (!branches.has(sourceBranch) || !branches.has(targetBranch)) {
            throw new Error('Branch not found');
        }

        const sourceVersion = versions.get(branches.get(sourceBranch));
        const targetVersion = versions.get(branches.get(targetBranch));

        // Find common ancestor
        const ancestor = this.findCommonAncestor(versions, sourceVersion, targetVersion);

        // Generate diffs
        const sourceDiff = this.diffTool.patch_make(ancestor.content, sourceVersion.content);
        const targetDiff = this.diffTool.patch_make(ancestor.content, targetVersion.content);

        // Attempt merge
        let mergedContent;
        let conflicts = [];

        if (resolution === 'auto') {
            [mergedContent, conflicts] = await this.autoMerge(
                ancestor.content,
                sourceDiff,
                targetDiff
            );
        } else {
            mergedContent = resolution === 'source' ? sourceVersion.content : targetVersion.content;
        }

        // Create new version for merge result
        const mergeVersion = {
            id: uuidv4(),
            content: mergedContent,
            hash: this.generateHash(mergedContent),
            timestamp: new Date(),
            parent: targetVersion.id,
            children: [],
            metadata: {
                type: 'merge',
                source: sourceBranch,
                target: targetBranch,
                conflicts: conflicts.length > 0,
                timestamp: new Date()
            }
        };

        // Update version graph
        versions.set(mergeVersion.id, mergeVersion);
        targetVersion.children.push(mergeVersion.id);
        sourceVersion.children.push(mergeVersion.id);

        // Update target branch pointer
        branches.set(targetBranch, mergeVersion.id);

        this.emit('branches-merged', {
            documentId,
            sourceBranch,
            targetBranch,
            mergeVersionId: mergeVersion.id,
            conflicts
        });

        return {
            version: mergeVersion,
            conflicts
        };
    }

    // Create a tag for a specific version
    createTag(documentId, tagName, versionId, metadata = {}) {
        const versions = this.versions.get(documentId);
        if (!versions || !versions.has(versionId)) {
            throw new Error('Version not found');
        }

        const tags = this.tags.get(documentId) || new Map();
        if (tags.has(tagName)) {
            throw new Error('Tag already exists');
        }

        const tag = {
            name: tagName,
            versionId,
            timestamp: new Date(),
            metadata
        };

        tags.set(tagName, tag);
        this.tags.set(documentId, tags);

        this.emit('tag-created', {
            documentId,
            tagName,
            versionId,
            metadata
        });

        return tag;
    }

    // Get version history
    getHistory(documentId, branchName = null) {
        const versions = this.versions.get(documentId);
        if (!versions) return [];

        let currentId;
        if (branchName) {
            const branches = this.branches.get(documentId);
            if (!branches || !branches.has(branchName)) return [];
            currentId = branches.get(branchName);
        } else {
            currentId = this.getCurrentBranch(documentId);
        }

        const history = [];
        while (currentId) {
            const version = versions.get(currentId);
            history.push(version);
            currentId = version.parent;
        }

        return history;
    }

    // Get version differences
    getDiff(documentId, fromVersionId, toVersionId) {
        const versions = this.versions.get(documentId);
        if (!versions) throw new Error('Document not found');

        const fromVersion = versions.get(fromVersionId);
        const toVersion = versions.get(toVersionId);

        if (!fromVersion || !toVersion) {
            throw new Error('Version not found');
        }

        const diffs = this.diffTool.diff_main(fromVersion.content, toVersion.content);
        this.diffTool.diff_cleanupSemantic(diffs);

        return diffs;
    }

    // Restore to a specific version
    restore(documentId, versionId) {
        const versions = this.versions.get(documentId);
        if (!versions || !versions.has(versionId)) {
            throw new Error('Version not found');
        }

        const version = versions.get(versionId);
        const currentBranch = this.getCurrentBranchName(documentId);

        // Create new version with restored content
        const restoredVersion = {
            id: uuidv4(),
            content: version.content,
            hash: version.hash,
            timestamp: new Date(),
            parent: this.getCurrentBranch(documentId),
            children: [],
            metadata: {
                type: 'restore',
                restoredFrom: versionId,
                timestamp: new Date()
            }
        };

        versions.set(restoredVersion.id, restoredVersion);
        this.branches.get(documentId).set(currentBranch, restoredVersion.id);

        this.emit('version-restored', {
            documentId,
            versionId: restoredVersion.id,
            restoredFrom: versionId
        });

        return restoredVersion;
    }

    // Helper methods
    generateHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    getCurrentBranch(documentId) {
        const branches = this.branches.get(documentId);
        return branches ? branches.get(this.getCurrentBranchName(documentId)) : null;
    }

    getCurrentBranchName(documentId) {
        const branches = this.branches.get(documentId);
        return branches ? Array.from(branches.keys())[0] : null;
    }

    findCommonAncestor(versions, version1, version2) {
        const ancestors1 = new Set();
        let current = version1;

        while (current) {
            ancestors1.add(current.id);
            current = versions.get(current.parent);
        }

        current = version2;
        while (current) {
            if (ancestors1.has(current.id)) {
                return current;
            }
            current = versions.get(current.parent);
        }

        return null;
    }

    async autoMerge(baseContent, sourceDiff, targetDiff) {
        const conflicts = [];
        
        // Apply source changes
        const [sourceResult] = this.diffTool.patch_apply(sourceDiff, baseContent);
        
        // Apply target changes
        const [mergedContent, results] = this.diffTool.patch_apply(targetDiff, sourceResult);
        
        // Check for conflicts
        results.forEach((applied, index) => {
            if (!applied) {
                conflicts.push({
                    index,
                    patch: targetDiff[index]
                });
            }
        });

        return [mergedContent, conflicts];
    }
}

module.exports = VersionService;
