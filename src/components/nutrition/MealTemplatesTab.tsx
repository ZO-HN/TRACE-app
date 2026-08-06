import { ScrollView, Text, View } from 'react-native';
import { useMealTemplates } from '../../hooks/useMealTemplates';
import { useLogFood } from '../../hooks/useLogFood';
import Card from '../ui/Card';
import Button from '../ui/Button';
import EmptyTabState from '../nutrition/EmptyTabState';

export default function MealTemplatesTab({ userId, onLogged }: { userId: string; onLogged: () => void }) {
  const { templates, isLoading } = useMealTemplates(userId);
  const logFood = useLogFood(userId);

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
    <ScrollView contentContainerClassName="p-4 gap-2">
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
              onPress={() => {
                for (const item of template.items) void logFood(item.name, item);
                onLogged();
              }}
            >
              Log all
            </Button>
          </Card>
        );
      })}
    </ScrollView>
  );
}
