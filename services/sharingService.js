const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class SharingService extends EventEmitter {
    constructor(documentStorageService, collaborationService) {
        super();
        this.documentStorage = documentStorageService;
        this.collaborationService = collaborationService;
        this.shares = new Map();
        this.accessTokens = new Map();
    }

    // Create a new share link
    async createShare(documentId, options = {}) {
        const defaults = {
            expiresAt: null, // null means no expiration
            permissions: ['read', 'comment'],
            requiresAuth: false,
            maxViews: null,
            password: null,
            watermark: true,
            trackViews: true,
            notifyOnAccess: true,
            allowDownload: false
        };

        const shareConfig = { ...defaults, ...options };
        const shareId = uuidv4();
        const shareToken = this.generateShareToken();

        const share = {
            id: shareId,
            documentId,
            token: shareToken,
            created: new Date(),
            ...shareConfig,
            views: 0,
            accessLog: [],
            active: true
        };

        if (shareConfig.password) {
            share.passwordHash = await this.hashPassword(shareConfig.password);
            delete share.password;
        }

        this.shares.set(shareId, share);

        this.emit('share-created', {
            shareId,
            documentId,
            config: shareConfig
        });

        return {
            shareId,
            shareUrl: this.generateShareUrl(shareId, shareToken),
            share
        };
    }

    // Validate and process access to a shared document
    async accessShare(shareId, shareToken, options = {}) {
        const share = this.shares.get(shareId);
        if (!share || !share.active) {
            throw new Error('Share not found or inactive');
        }

        // Validate share token
        if (share.token !== shareToken) {
            throw new Error('Invalid share token');
        }

        // Check expiration
        if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
            throw new Error('Share link has expired');
        }

        // Check max views
        if (share.maxViews && share.views >= share.maxViews) {
            throw new Error('Maximum view count reached');
        }

        // Validate password if required
        if (share.passwordHash) {
            if (!options.password) {
                throw new Error('Password required');
            }
            const isValidPassword = await this.validatePassword(
                options.password,
                share.passwordHash
            );
            if (!isValidPassword) {
                throw new Error('Invalid password');
            }
        }

        // Generate access token
        const accessToken = this.generateAccessToken(shareId);
        this.accessTokens.set(accessToken, {
            shareId,
            created: new Date(),
            lastAccessed: new Date()
        });

        // Update share statistics
        share.views++;
        share.accessLog.push({
            timestamp: new Date(),
            ip: options.ip,
            userAgent: options.userAgent
        });

        // Notify owner if enabled
        if (share.notifyOnAccess) {
            this.emit('share-accessed', {
                shareId,
                accessDetails: {
                    timestamp: new Date(),
                    ip: options.ip,
                    userAgent: options.userAgent
                }
            });
        }

        return {
            accessToken,
            share: this.sanitizeShare(share),
            document: await this.getSharedDocument(share.documentId, share.permissions)
        };
    }

    // Validate an access token
    async validateAccessToken(accessToken) {
        const access = this.accessTokens.get(accessToken);
        if (!access) {
            throw new Error('Invalid access token');
        }

        const share = this.shares.get(access.shareId);
        if (!share || !share.active) {
            throw new Error('Share not found or inactive');
        }

        access.lastAccessed = new Date();
        return {
            shareId: access.shareId,
            permissions: share.permissions
        };
    }

    // Update share settings
    async updateShare(shareId, updates) {
        const share = this.shares.get(shareId);
        if (!share) {
            throw new Error('Share not found');
        }

        // Handle password updates separately
        if (updates.password) {
            updates.passwordHash = await this.hashPassword(updates.password);
            delete updates.password;
        }

        Object.assign(share, updates);
        this.emit('share-updated', { shareId, updates });

        return this.sanitizeShare(share);
    }

    // Revoke a share
    async revokeShare(shareId) {
        const share = this.shares.get(shareId);
        if (!share) {
            throw new Error('Share not found');
        }

        share.active = false;
        
        // Remove all associated access tokens
        for (const [token, access] of this.accessTokens.entries()) {
            if (access.shareId === shareId) {
                this.accessTokens.delete(token);
            }
        }

        this.emit('share-revoked', { shareId });
        return true;
    }

    // Get active shares for a document
    getDocumentShares(documentId) {
        const shares = [];
        for (const share of this.shares.values()) {
            if (share.documentId === documentId && share.active) {
                shares.push(this.sanitizeShare(share));
            }
        }
        return shares;
    }

    // Add comment to shared document
    async addComment(shareId, accessToken, comment) {
        const access = await this.validateAccessToken(accessToken);
        if (!access.permissions.includes('comment')) {
            throw new Error('No comment permission');
        }

        const share = this.shares.get(shareId);
        return this.collaborationService.addComment(share.documentId, {
            ...comment,
            source: 'share',
            shareId
        });
    }

    // Helper methods
    generateShareToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    generateAccessToken(shareId) {
        return crypto.randomBytes(32).toString('hex');
    }

    async hashPassword(password) {
        return new Promise((resolve, reject) => {
            const salt = crypto.randomBytes(16);
            crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
                if (err) reject(err);
                resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'));
            });
        });
    }

    async validatePassword(password, hash) {
        return new Promise((resolve, reject) => {
            const [salt, key] = hash.split(':');
            const saltBuffer = Buffer.from(salt, 'hex');
            crypto.pbkdf2(password, saltBuffer, 100000, 64, 'sha512', (err, derivedKey) => {
                if (err) reject(err);
                resolve(derivedKey.toString('hex') === key);
            });
        });
    }

    generateShareUrl(shareId, token) {
        // This should be configured based on your application's domain
        return `/share/${shareId}?token=${token}`;
    }

    sanitizeShare(share) {
        const sanitized = { ...share };
        delete sanitized.token;
        delete sanitized.passwordHash;
        return sanitized;
    }

    async getSharedDocument(documentId, permissions) {
        const doc = await this.documentStorage.getDocument(documentId);
        if (!doc) throw new Error('Document not found');

        // Remove sensitive information based on permissions
        return this.sanitizeDocument(doc, permissions);
    }

    sanitizeDocument(doc, permissions) {
        const sanitized = { ...doc };
        
        if (!permissions.includes('read')) {
            throw new Error('No read permission');
        }

        // Remove sensitive metadata if not allowed
        if (!permissions.includes('full_access')) {
            delete sanitized.metadata.author;
            delete sanitized.metadata.internal;
        }

        return sanitized;
    }
}

module.exports = SharingService;
