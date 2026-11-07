import { localDate } from '../../lib/localDate';
import CatalogStatus from './CatalogStatus';
import { ScrollView, Text, View } from 'react-native';
import { useMealTemplates } from '../../hooks/useMealTemplates';
import { useOutboxStore } from '../../lib/outbox/outboxStore';
import { toNutritionLogFromFood } from '../../lib/nutrition/mapFoodToLog';
import { randomUUID } from 'expo-crypto';
import type { NutritionLogInsert } from '../../lib/nutrition/types';
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
  const enqueueBatch = useOutboxStore(s => s.enqueueNutritionBatch);
  const action = useAsyncAction();
  const pending = useRef<{ owner: string; template: string; payloads: NutritionLogInsert[]; items: MealTemplateItem[] } | null>(null);

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
                if (pending.current && (pending.current.owner !== userId || pending.current.template !== template.id)) throw new Error('Retry the previous meal first. No other meal was logged.');
                if (!pending.current) {
                  const loggedAt = new Date().toISOString();
                  pending.current = { owner: userId, template: template.id, items: template.items, payloads: template.items.map(item => ({ ...toNutritionLogFromFood(randomUUID(), userId, item.name, item, 'TYPED', slot), logged_at: loggedAt, recorded_date: localDate(new Date(loggedAt)) })) };
                }
                const request = pending.current;
                await enqueueBatch(request.payloads);
                pending.current = null;
                request.items.forEach(onLogged);
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
