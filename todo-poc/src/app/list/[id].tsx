import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTodoLists } from '@/context/todo-lists-context';
import { useTheme } from '@/hooks/use-theme';

export default function TodoListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { lists, addTask, toggleTask, deleteTask } = useTodoLists();
  const [text, setText] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const list = lists.find((item) => item.id === id);

  if (!list) {
    return null;
  }

  const listId = list.id;
  const tasks = list.tasks;
  const completedCount = tasks.filter((task) => task.done).length;
  const pendingDeleteTask = tasks.find((task) => task.id === pendingDeleteId) ?? null;

  function handleAddTask() {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    addTask(listId, trimmed);
    setText('');
  }

  function confirmDelete() {
    if (pendingDeleteId === null) {
      return;
    }
    deleteTask(listId, pendingDeleteId);
    setPendingDeleteId(null);
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: list.name,
          headerLeft: () => (
            <Pressable testID="back-button" onPress={() => router.back()}>
              <ThemedText type="link">Back</ThemedText>
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea}>
        <ThemedText testID="task-counter" type="small" themeColor="textSecondary">
          {completedCount}/{tasks.length} completed
        </ThemedText>

        <ThemedView style={styles.inputRow}>
          <TextInput
            testID="task-input"
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.backgroundElement },
            ]}
            placeholder="Type a task..."
            placeholderTextColor={theme.textSecondary}
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleAddTask}
            returnKeyType="done"
          />
          <Pressable
            testID="add-task-button"
            style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]}
            onPress={handleAddTask}
          >
            <ThemedText type="smallBold">ADD</ThemedText>
          </Pressable>
        </ThemedView>

        <FlatList
          testID="task-list"
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={tasks}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <ThemedText
              testID="empty-state"
              type="small"
              themeColor="textSecondary"
              style={styles.empty}
            >
              No tasks yet. Add one above.
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`task-row-${item.id}`}
              style={[styles.taskRow, { backgroundColor: theme.backgroundElement }]}
              onPress={() => toggleTask(listId, item.id)}
              onLongPress={() => setPendingDeleteId(item.id)}
            >
              <ThemedView
                testID={`task-checkbox-${item.id}`}
                style={[
                  styles.checkbox,
                  { borderColor: theme.textSecondary },
                  item.done && { backgroundColor: theme.text, borderColor: theme.text },
                ]}
              >
                {item.done && (
                  <ThemedText style={[styles.checkmark, { color: theme.background }]}>
                    ✓
                  </ThemedText>
                )}
              </ThemedView>
              <ThemedText
                testID={`task-text-${item.id}`}
                style={[styles.taskText, item.done && styles.taskTextDone]}
                themeColor={item.done ? 'textSecondary' : 'text'}
              >
                {item.text}
              </ThemedText>
            </Pressable>
          )}
        />
      </SafeAreaView>

      <Modal
        visible={pendingDeleteTask !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDeleteId(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPendingDeleteId(null)}>
          <Pressable
            testID="delete-dialog"
            style={[styles.modalCard, { backgroundColor: theme.background }]}
            onPress={(event) => event.stopPropagation()}
          >
            <ThemedText type="smallBold" style={styles.modalTitle}>
              Delete task?
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.modalMessage}>
              {pendingDeleteTask?.text}
            </ThemedText>
            <ThemedView style={styles.modalActions}>
              <Pressable
                testID="delete-cancel-button"
                style={[styles.modalButton, { backgroundColor: theme.backgroundElement }]}
                onPress={() => setPendingDeleteId(null)}
              >
                <ThemedText type="smallBold">No</ThemedText>
              </Pressable>
              <Pressable
                testID="delete-confirm-button"
                style={[styles.modalButton, { backgroundColor: theme.backgroundSelected }]}
                onPress={confirmDelete}
              >
                <ThemedText type="smallBold">Yes</ThemedText>
              </Pressable>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  addButton: {
    height: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
    alignSelf: 'stretch',
  },
  listContent: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Spacing.one,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  taskText: {
    flex: 1,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    fontSize: 16,
  },
  modalMessage: {},
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  modalButton: {
    minWidth: 64,
    height: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
