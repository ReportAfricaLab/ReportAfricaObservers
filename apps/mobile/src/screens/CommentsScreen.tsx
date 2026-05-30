import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { commentsAPI } from '../services/api';
import { useI18n } from '../store/useI18n';
import { theme } from '../theme';

export default function CommentsScreen({ route }: any) {
  const { reportId } = route.params;
  const { t } = useI18n();
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadComments(1);
  }, [reportId]);

  const loadComments = (p: number) => {
    setLoading(p === 1);
    commentsAPI.getByReport(reportId, p)
      .then((r) => {
        const newData = r.data?.data || [];
        setComments(p === 1 ? newData : [...comments, ...newData]);
        setHasMore(p < (r.data?.meta?.totalPages || 1));
        setPage(p);
      })
      .finally(() => setLoading(false));
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await commentsAPI.create({ reportId, text: text.trim() });
      setComments([res.data, ...comments]);
      setText('');
    } catch {}
    setSubmitting(false);
  };

  const handleLike = async (id: string) => {
    try {
      await commentsAPI.like(id);
      setComments((prev) => prev.map((c) => c.id === id ? { ...c, likes: (c.likes || 0) + 1 } : c));
    } catch {}
  };

  const renderComment = ({ item }: { item: any }) => (
    <View style={styles.commentCard}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{item.user?.displayName?.[0] || '?'}</Text></View>
        <View style={styles.commentMeta}>
          <Text style={styles.commentAuthor}>{item.user?.displayName || item.user?.username || 'User'}</Text>
          <Text style={styles.commentTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <TouchableOpacity onPress={() => handleLike(item.id)} style={styles.likeBtn}>
          <Text style={styles.likeText}>♥ {item.likes || 0}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.commentText}>{item.text}</Text>
      {item.replies?.length > 0 && (
        <View style={styles.replies}>
          {item.replies.map((reply: any) => (
            <View key={reply.id} style={styles.replyCard}>
              <Text style={styles.replyAuthor}>{reply.user?.displayName || 'User'}</Text>
              <Text style={styles.replyText}>{reply.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.heading}>💬 Comments</Text>

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : comments.length === 0 ? (
        <Text style={styles.loadingText}>{t('comment.empty', 'No comments yet. Be the first!')}</Text>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          contentContainerStyle={styles.list}
          onEndReached={() => hasMore && loadComments(page + 1)}
          onEndReachedThreshold={0.3}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('comment.write', 'Write a comment...')}
          maxLength={1000}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, submitting && styles.sendBtnDisabled]} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.sendBtnText}>{t('comment.post', '↑')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background, paddingTop: 60 },
  heading: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.light.text, paddingHorizontal: 16, marginBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  commentCard: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.light.border },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  commentAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  commentMeta: { flex: 1 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: theme.colors.light.text },
  commentTime: { fontSize: 10, color: theme.colors.light.textSecondary },
  commentText: { fontSize: 14, color: theme.colors.light.text, lineHeight: 20 },
  likeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  likeText: { fontSize: 12, color: theme.colors.emergency },
  replies: { marginTop: 8, marginLeft: 20, borderLeftWidth: 2, borderLeftColor: theme.colors.light.border, paddingLeft: 10 },
  replyCard: { marginBottom: 6 },
  replyAuthor: { fontSize: 11, fontWeight: '600', color: theme.colors.light.textSecondary },
  replyText: { fontSize: 13, color: theme.colors.light.text },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: theme.colors.light.border, backgroundColor: '#fff', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 80 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  loadingText: { textAlign: 'center', color: theme.colors.light.textSecondary, marginTop: 40 },
});
