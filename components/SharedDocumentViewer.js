import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Divider,
    Tooltip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Lock,
    LockOpen,
    Comment,
    Download,
    ContentCopy,
    Visibility,
    Share,
    Print,
} from '@mui/icons-material';

const SharedDocumentViewer = ({ sharingService, documentId, shareId, shareToken }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [document, setDocument] = useState(null);
    const [shareInfo, setShareInfo] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [password, setPassword] = useState('');
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);

    useEffect(() => {
        loadDocument();
    }, [shareId, shareToken]);

    const loadDocument = async (password = null) => {
        try {
            setLoading(true);
            setError(null);

            const response = await sharingService.accessShare(shareId, shareToken, {
                password,
                userAgent: navigator.userAgent,
                ip: await fetchClientIP()
            });

            setAccessToken(response.accessToken);
            setShareInfo(response.share);
            setDocument(response.document);
            setComments(response.document.comments || []);

            if (response.share.watermark) {
                applyWatermark();
            }
        } catch (error) {
            if (error.message === 'Password required') {
                setShowPasswordDialog(true);
            } else {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async () => {
        setShowPasswordDialog(false);
        await loadDocument(password);
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        try {
            const comment = await sharingService.addComment(shareId, accessToken, {
                content: newComment,
                position: getSelectionPosition(),
                timestamp: new Date()
            });

            setComments([...comments, comment]);
            setNewComment('');
        } catch (error) {
            setError('Failed to add comment: ' + error.message);
        }
    };

    const handleCopyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
    };

    const handleDownload = async () => {
        if (!shareInfo.allowDownload) {
            setError('Download not allowed');
            return;
        }

        try {
            // Implement download logic
        } catch (error) {
            setError('Failed to download: ' + error.message);
        }
    };

    const handlePrint = async () => {
        window.print();
    };

    // Helper functions
    const fetchClientIP = async () => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    };

    const getSelectionPosition = () => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        return {
            top: rect.top,
            left: rect.left,
            text: range.toString()
        };
    };

    const applyWatermark = () => {
        // Implement watermark logic
        const watermark = document.createElement('div');
        watermark.className = 'watermark';
        watermark.textContent = `Shared Document - View Only - ${new Date().toLocaleDateString()}`;
        document.body.appendChild(watermark);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h5">{document?.title}</Typography>
                    <Box>
                        <Tooltip title="Copy Share Link">
                            <IconButton onClick={handleCopyLink}>
                                <ContentCopy />
                            </IconButton>
                        </Tooltip>
                        {shareInfo?.allowDownload && (
                            <Tooltip title="Download">
                                <IconButton onClick={handleDownload}>
                                    <Download />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title="Print">
                            <IconButton onClick={handlePrint}>
                                <Print />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
                {shareInfo?.expiresAt && (
                    <Typography variant="caption" color="textSecondary">
                        Expires: {new Date(shareInfo.expiresAt).toLocaleString()}
                    </Typography>
                )}
            </Paper>

            {/* Document Content */}
            <Paper elevation={1} sx={{ p: 3, mb: 2 }}>
                <Box className="document-content" sx={{ position: 'relative' }}>
                    {/* Render document content */}
                    <Typography>{document?.content}</Typography>
                </Box>
            </Paper>

            {/* Comments Section */}
            {shareInfo?.permissions.includes('comment') && (
                <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Comments
                    </Typography>
                    <Box mb={2}>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <Button
                            variant="contained"
                            startIcon={<Comment />}
                            onClick={handleAddComment}
                            sx={{ mt: 1 }}
                        >
                            Add Comment
                        </Button>
                    </Box>
                    <Divider />
                    <Box mt={2}>
                        {comments.map((comment, index) => (
                            <Box key={index} mb={2}>
                                <Typography variant="subtitle2" color="textSecondary">
                                    {new Date(comment.timestamp).toLocaleString()}
                                </Typography>
                                <Typography>{comment.content}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            )}

            {/* Password Dialog */}
            <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)}>
                <DialogTitle>Password Required</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        type="password"
                        label="Enter Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
                    <Button onClick={handlePasswordSubmit} variant="contained">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SharedDocumentViewer;
