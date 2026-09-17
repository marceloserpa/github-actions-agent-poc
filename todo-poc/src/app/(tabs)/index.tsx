import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTodoLists } from '@/context/todo-lists-context';
import { useTheme } from '@/hooks/use-theme';

export default function TodoListsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { lists, createList } = useTodoLists();
  const [name, setName] = useState('');

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    createList(trimmed);
    setName('');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle" style={styles.title}>
          Todo Lists
        </ThemedText>

        <ThemedView style={styles.inputRow}>
          <TextInput
            testID="list-name-input"
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.backgroundElement },
            ]}
            placeholder="New list name..."
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
            onSubmitEditing={handleCreate}
            returnKeyType="done"
          />
          <Pressable
            testID="create-list-button"
            style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]}
            onPress={handleCreate}
          >
            <ThemedText type="smallBold">CREATE</ThemedText>
          </Pressable>
        </ThemedView>

        <FlatList
          testID="todo-list-list"
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={lists}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <ThemedText
              testID="empty-lists-state"
              type="small"
              themeColor="textSecondary"
              style={styles.empty}
            >
              No todo lists yet. Create one above.
            </ThemedText>
          }
          renderItem={({ item }) => {
            const completedCount = item.tasks.filter((task) => task.done).length;
            return (
              <Pressable
                testID={`todo-list-row-${item.id}`}
                accessibilityLabel={`${item.name} ${completedCount}/${item.tasks.length}`}
                style={[styles.listRow, { backgroundColor: theme.backgroundElement }]}
                onPress={() => router.push({ pathname: '/list/[id]', params: { id: item.id } })}
              >
                <ThemedText style={styles.listName}>{item.name}</ThemedText>
                <ThemedText
                  testID={`todo-list-progress-${item.id}`}
                  type="small"
                  themeColor="textSecondary"
                >
                  {completedCount}/{item.tasks.length}
                </ThemedText>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
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
  title: {
    textAlign: 'center',
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
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  listName: {
    flex: 1,
  },
});
