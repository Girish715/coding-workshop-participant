import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  Fab,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Close, SmartToy } from '@mui/icons-material';
import { askChatbot } from '../services/api.js';
import { useAuth } from '../AuthContext.jsx';

function ChatMessageBubble({ from, text }) {
  const isUser = from === 'user';
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <Box
        sx={{
          maxWidth: '92%',
          p: 1.15,
          borderRadius: 2,
          bgcolor: isUser ? 'rgba(255, 122, 26, 0.2)' : 'background.default',
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, mb: 0.35, opacity: 0.85 }}>
          {isUser ? 'You' : 'Assistant'}
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>{text}</Typography>
      </Box>
    </Box>
  );
}

ChatMessageBubble.propTypes = {
  from: PropTypes.oneOf(['user', 'assistant']).isRequired,
  text: PropTypes.string.isRequired,
};

/**
 * Floating, role-scoped chatbot launcher available to admin and manager users.
 */
export default function ChatbotWidget() {
  const { user } = useAuth();
  const canUse = useMemo(() => ['admin', 'manager'].includes(user?.role || ''), [user?.role]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([
    {
      from: 'assistant',
      text: 'Ask me about attrition, promotion-ready employees, team health, and training trends in your scope.',
    },
  ]);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (!open || !scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages, loading, open]);

  const submitMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setError('');
    setMessages((prev) => [...prev, { from: 'user', text: trimmed }]);
    setMessage('');
    setLoading(true);

    try {
      const { data } = await askChatbot(trimmed);
      const answer = typeof data?.answer === 'string' && data.answer.trim() ? data.answer : 'No response returned.';
      setMessages((prev) => [...prev, { from: 'assistant', text: answer }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Assistant is unavailable right now.';
      setError(errMsg);
      setMessages((prev) => [...prev, { from: 'assistant', text: `Error: ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!canUse) {
    return null;
  }

  return (
    <>
      {open && (
        <Card
          sx={{
            position: 'fixed',
            right: { xs: 10, md: 18 },
            bottom: { xs: 74, md: 84 },
            width: { xs: 'calc(100vw - 20px)', sm: 380 },
            maxWidth: '96vw',
            zIndex: (theme) => theme.zIndex.tooltip + 2,
          }}
        >
          <Box sx={{ px: 1.5, py: 1.15, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <SmartToy sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Assistant</Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Divider />

          <Stack ref={scrollerRef} spacing={1} sx={{ px: 1.5, py: 1.25, maxHeight: '45vh', overflowY: 'auto' }}>
            {messages.map((entry, index) => (
              <ChatMessageBubble key={`${entry.from}-${index}`} from={entry.from} text={entry.text} />
            ))}
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={14} />
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Thinking...</Typography>
              </Box>
            )}
          </Stack>

          <Divider />

          <Box sx={{ p: 1.25 }}>
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submitMessage();
                  }
                }}
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                placeholder="Ask about team trends in your scope..."
              />
              <Button variant="contained" color="secondary" onClick={submitMessage} disabled={loading || !message.trim()}>
                Send
              </Button>
            </Box>
          </Box>
        </Card>
      )}

      <Fab
        color="secondary"
        aria-label="Open assistant"
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          position: 'fixed',
          right: { xs: 10, md: 18 },
          bottom: { xs: 12, md: 20 },
          zIndex: (theme) => theme.zIndex.tooltip + 1,
          width: 54,
          height: 54,
        }}
      >
        <SmartToy sx={{ fontSize: 24 }} />
      </Fab>
    </>
  );
}

ChatbotWidget.propTypes = {};