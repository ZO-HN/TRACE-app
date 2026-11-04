import CatalogStatus from './CatalogStatus';
import { ScrollView, Text, View } from 'react-native';
import { useMealTemplates } from '../../hooks/useMealTemplates';
import { useLogFood } from '../../hooks/useLogFood';
import type { MealTemplateItem } from '../../lib/nutrition/types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import EmptyTabState from '../nutrition/EmptyTabState';
import { useRef } from 'react';
import { useAsyncAction } from '../../hooks/useAsyncAction';

export default function MealTemplatesTab({
  userId,
  slot,
  onLogged,
}: {
  userId: string;
  slot?: number | null;
  onLogged: (item: MealTemplateItem) => void;
}) {
  const { templates, isLoading, error, refresh } = useMealTemplates(userId);
  const logFood = useLogFood(userId);
  const action = useAsyncAction();
  const savedCounts = useRef(new Map<string, number>());

  if (isLoading || error) return <CatalogStatus loading={isLoading} error={error} onRetry={refresh} />;

  if (!isLoading && templates.length === 0) {
    return (
      <EmptyTabState
        icon="albums-outline"
        title="No templates yet"
        description="Save a meal as a template to quickly re-use it"
      />
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerClassName="p-4 gap-2">
      {action.error && <Text className="text-xs text-red-400">{action.error}</Text>}
      {templates.map((template) => {
        const totalCalories = template.items.reduce((sum, i) => sum + (i.calories ?? 0), 0);
        return (
          <Card key={template.id} className="p-4 gap-2">
            <Text className="text-white font-semibold">{template.name}</Text>
            <Text className="text-xs text-gray-500">
              {template.items.length} items · {totalCalories} kcal
            </Text>
            <Button
              size="sm"
              disabled={action.pending || template.items.length === 0}
              onPress={() => void action.run(async () => {
                const start = savedCounts.current.get(template.id) ?? 0;
                for (let index = start; index < template.items.length; index++) {
                  const item = template.items[index];
                  await logFood(item.name, item, slot);
                  savedCounts.current.set(template.id, index + 1);
                  onLogged(item);
                }
                savedCounts.current.delete(template.id);
              })}
            >
              Log all
            </Button>
          </Card>
        );
      })}
    </ScrollView>
  );
}
