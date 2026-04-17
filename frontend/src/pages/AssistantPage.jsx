import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { SmartToy, Person } from '@mui/icons-material';
import { askChatbot } from '../services/api.js';
import { useAuth } from '../AuthContext.jsx';

function ChatBubble({ from, text }) {
  const isUser = from === 'user';
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <Box
        sx={{
          maxWidth: { xs: '90%', md: '80%' },
          p: 1.25,
          borderRadius: 2,
          bgcolor: isUser ? 'rgba(255,122,26,0.2)' : 'background.default',
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, mb: 0.4, opacity: 0.8 }}>
          {isUser ? 'You' : 'Assistant'}
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>{text}</Typography>
      </Box>
    </Box>
  );
}

ChatBubble.propTypes = {
  from: PropTypes.oneOf(['user', 'assistant']).isRequired,
  text: PropTypes.string.isRequired,
};

/**
 * Role-scoped assistant for admin and manager users.
 */
export default function AssistantPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([
    {
      from: 'assistant',
      text: 'Ask me about team performance, attrition risk, active plans, and onboarding trends. I only use your allowed data scope.',
    },
  ]);

  const canUse = useMemo(() => ['admin', 'manager'].includes(user?.role || ''), [user?.role]);

  const submitMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setError('');
    setMessages((prev) => [...prev, { from: 'user', text: trimmed }]);
    setMessage('');
    setLoading(true);

    try {
      const { data } = await askChatbot(trimmed);
      setMessages((prev) => [...prev, { from: 'assistant', text: data.answer || 'No response returned.' }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Assistant is unavailable right now.';
      setError(errMsg);
      setMessages((prev) => [...prev, { from: 'assistant', text: `Error: ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!canUse) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">Only admin and manager roles can access the assistant.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToy /> AI Assistant
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.875rem' }}>
          Role-scoped HR insights powered by Gemini.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={1.2} sx={{ maxHeight: '58vh', overflowY: 'auto', pr: 0.5 }}>
            {messages.map((entry, index) => (
              <ChatBubble key={`${entry.from}-${index}`} from={entry.from} text={entry.text} />
            ))}
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Thinking...</Typography>
              </Box>
            )}
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          {error && <Alert severity="error" sx={{ mb: 1.25 }}>{error}</Alert>}

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
              multiline
              minRows={2}
              maxRows={5}
              fullWidth
              placeholder="Ask about attrition, promotion-ready employees, training, or team health..."
              InputProps={{
                startAdornment: (
                  <Person sx={{ mr: 1, mt: 0.5, color: 'text.secondary' }} />
                ),
              }}
            />
            <Button variant="contained" color="secondary" onClick={submitMessage} disabled={loading || !message.trim()}>
              Send
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
