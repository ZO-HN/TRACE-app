import { useMemo, useState, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Select from '../ui/Select';
import ToolField, { ToolResult, toNumber } from './ToolField';
import { lbsToKg } from '../../lib/units';
import {
  bodyFatNavy,
  calculateMacros,
  calculatePlates,
  calculateTdee,
  calculateWaterIntakeLiters,
  dotsScore,
  estimateOneRepMax,
  proteinTargetGrams,
  wilksScore,
  type ActivityLevel,
  type Goal,
  type Sex,
} from '../../lib/calculators/formulas';

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;

const GOAL_OPTIONS = [
  { value: 'cut', label: 'Cut' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'bulk', label: 'Bulk' },
] as const;

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary (little/no exercise)' },
  { value: 'light', label: 'Light (1-3 days/week)' },
  { value: 'moderate', label: 'Moderate (3-5 days/week)' },
  { value: 'active', label: 'Active (6-7 days/week)' },
  { value: 'very_active', label: 'Very active (2x/day)' },
] as const;

export function TdeeCalculator() {
  const [sex, setSex] = useState<Sex>('male');
  const [weight, setWeight] = useState('180');
  const [height, setHeight] = useState('178');
  const [age, setAge] = useState('28');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');

  const result = useMemo(() => {
    const w = toNumber(weight);
    const h = toNumber(height);
    const a = toNumber(age);
    if (w === null || h === null || a === null) return null;
    return calculateTdee(sex, lbsToKg(w), h, a, activity, goal);
  }, [sex, weight, height, age, activity, goal]);

  return (
    <View className="gap-4">
      <Select value={sex} options={SEX_OPTIONS as unknown as { value: Sex; label: string }[]} onChange={setSex} />
      <ToolField label="Bodyweight" value={weight} onChange={setWeight} suffix="lb" />
      <ToolField label="Height" value={height} onChange={setHeight} suffix="cm" />
      <ToolField label="Age" value={age} onChange={setAge} suffix="yrs" />
      <View className="gap-2">
        <Text className="text-sm text-gray-400">Activity level</Text>
        <Select
          value={activity}
          options={ACTIVITY_OPTIONS as unknown as { value: ActivityLevel; label: string }[]}
          onChange={setActivity}
        />
      </View>
      <View className="gap-2">
        <Text className="text-sm text-gray-400">Goal</Text>
        <Select value={goal} options={GOAL_OPTIONS as unknown as { value: Goal; label: string }[]} onChange={setGoal} />
      </View>
      {result && (
        <View className="gap-2">
          <ToolResult label="BMR" value={`${result.bmr} kcal`} />
          <ToolResult label="TDEE (maintenance)" value={`${result.tdee} kcal`} />
          <ToolResult label="Daily target" value={`${result.calorieTarget} kcal`} />
        </View>
      )}
    </View>
  );
}

export function MacroCalculator() {
  const [weight, setWeight] = useState('180');
  const [calories, setCalories] = useState('2400');
  const [goal, setGoal] = useState<Goal>('maintain');

  const result = useMemo(() => {
    const w = toNumber(weight);
    const c = toNumber(calories);
    if (w === null || c === null) return null;
    return calculateMacros(c, lbsToKg(w), goal);
  }, [weight, calories, goal]);

  return (
    <View className="gap-4">
      <ToolField label="Bodyweight" value={weight} onChange={setWeight} suffix="lb" />
      <ToolField label="Daily calorie target" value={calories} onChange={setCalories} suffix="kcal" />
      <View className="gap-2">
        <Text className="text-sm text-gray-400">Goal</Text>
        <Select value={goal} options={GOAL_OPTIONS as unknown as { value: Goal; label: string }[]} onChange={setGoal} />
      </View>
      {result && (
        <View className="gap-2">
          <ToolResult label="Protein" value={`${result.proteinG} g`} />
          <ToolResult label="Fat" value={`${result.fatG} g`} />
          <ToolResult label="Carbs" value={`${result.carbsG} g`} />
        </View>
      )}
    </View>
  );
}

export function ProteinCalculator() {
  const [weight, setWeight] = useState('180');
  const [goal, setGoal] = useState<Goal>('maintain');

  const result = useMemo(() => {
    const w = toNumber(weight);
    if (w === null) return null;
    return proteinTargetGrams(lbsToKg(w), goal);
  }, [weight, goal]);

  return (
    <View className="gap-4">
      <ToolField label="Bodyweight" value={weight} onChange={setWeight} suffix="lb" />
      <View className="gap-2">
        <Text className="text-sm text-gray-400">Goal</Text>
        <Select value={goal} options={GOAL_OPTIONS as unknown as { value: Goal; label: string }[]} onChange={setGoal} />
      </View>
      {result !== null && <ToolResult label="Daily protein target" value={`${result} g`} />}
    </View>
  );
}

export function OneRepMaxCalculator() {
  const [weight, setWeight] = useState('225');
  const [reps, setReps] = useState('5');

  const result = useMemo(() => {
    const w = toNumber(weight);
    const r = toNumber(reps);
    if (w === null || r === null || r < 1) return null;
    return estimateOneRepMax(w, r);
  }, [weight, reps]);

  return (
    <View className="gap-4">
      <ToolField label="Weight lifted" value={weight} onChange={setWeight} suffix="lb" />
      <ToolField label="Reps" value={reps} onChange={setReps} />
      {result !== null && <ToolResult label="Estimated 1RM" value={`${result} lb`} />}
    </View>
  );
}

export function BodyFatCalculator() {
  const [sex, setSex] = useState<Sex>('male');
  const [height, setHeight] = useState('178');
  const [neck, setNeck] = useState('38');
  const [waist, setWaist] = useState('85');
  const [hip, setHip] = useState('95');

  const result = useMemo(() => {
    const h = toNumber(height);
    const n = toNumber(neck);
    const w = toNumber(waist);
    const hp = toNumber(hip);
    if (h === null || n === null || w === null) return null;
    if (sex === 'female' && hp === null) return null;
    return bodyFatNavy(sex, h, n, w, sex === 'female' ? (hp ?? undefined) : undefined);
  }, [sex, height, neck, waist, hip]);

  return (
    <View className="gap-4">
      <Select value={sex} options={SEX_OPTIONS as unknown as { value: Sex; label: string }[]} onChange={setSex} />
      <ToolField label="Height" value={height} onChange={setHeight} suffix="cm" />
      <ToolField label="Neck circumference" value={neck} onChange={setNeck} suffix="cm" />
      <ToolField label="Waist circumference" value={waist} onChange={setWaist} suffix="cm" />
      {sex === 'female' && <ToolField label="Hip circumference" value={hip} onChange={setHip} suffix="cm" />}
      {result !== null && <ToolResult label="Body fat" value={`${result}%`} />}
    </View>
  );
}

const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const LB_PLATES = [45, 35, 25, 10, 5, 2.5];

export function PlateCalculator() {
  const [unit, setUnit] = useState<'kg' | 'lb'>('lb');
  const [target, setTarget] = useState('225');
  const [bar, setBar] = useState('45');

  const result = useMemo(() => {
    const t = toNumber(target);
    const b = toNumber(bar);
    if (t === null || b === null) return null;
    return calculatePlates(t, b, unit === 'kg' ? KG_PLATES : LB_PLATES);
  }, [target, bar, unit]);

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="text-sm text-gray-400">Unit</Text>
        <Select
          value={unit}
          options={[
            { value: 'lb', label: 'Pounds (45 lb bar)' },
            { value: 'kg', label: 'Kilograms (20 kg bar)' },
          ]}
          onChange={(v) => {
            setUnit(v);
            setBar(v === 'kg' ? '20' : '45');
          }}
        />
      </View>
      <ToolField label="Target weight" value={target} onChange={setTarget} suffix={unit} />
      <ToolField label="Bar weight" value={bar} onChange={setBar} suffix={unit} />
      {result && (
        <View className="gap-2">
          {Object.entries(result.perSideKg)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([plate, count]) => (
              <ToolResult key={plate} label={`${plate} ${unit} plates`} value={`× ${count} per side`} />
            ))}
          <ToolResult label="Total" value={`${result.totalKg} ${unit}`} />
          {result.remainderKg > 0 && (
            <Text className="text-xs text-gray-500">
              {result.remainderKg} {unit} short of target with the plates available — add smaller plates.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export function WaterIntakeCalculator() {
  const [weight, setWeight] = useState('180');
  const [trainingDay, setTrainingDay] = useState(true);

  const result = useMemo(() => {
    const w = toNumber(weight);
    if (w === null) return null;
    return calculateWaterIntakeLiters(lbsToKg(w), trainingDay);
  }, [weight, trainingDay]);

  return (
    <View className="gap-4">
      <ToolField label="Bodyweight" value={weight} onChange={setWeight} suffix="lb" />
      <Pressable
        onPress={() => setTrainingDay((v) => !v)}
        className="flex-row items-center justify-between bg-surface border border-border rounded-xl px-4 py-3.5"
      >
        <Text className="text-white font-medium">Training day</Text>
        <Ionicons
          name={trainingDay ? 'checkbox' : 'square-outline'}
          size={22}
          color={trainingDay ? '#4ADE80' : '#6B7280'}
        />
      </Pressable>
      {result !== null && <ToolResult label="Daily water target" value={`${result} L`} />}
    </View>
  );
}

export function StrengthScoreCalculator() {
  const [sex, setSex] = useState<Sex>('male');
  const [bodyweight, setBodyweight] = useState('180');
  const [total, setTotal] = useState('1000');

  const result = useMemo(() => {
    const bw = toNumber(bodyweight);
    const t = toNumber(total);
    if (bw === null || t === null) return null;
    const bwKg = lbsToKg(bw);
    const totalKg = lbsToKg(t);
    return { wilks: wilksScore(sex, bwKg, totalKg), dots: dotsScore(sex, bwKg, totalKg) };
  }, [sex, bodyweight, total]);

  return (
    <View className="gap-4">
      <Select value={sex} options={SEX_OPTIONS as unknown as { value: Sex; label: string }[]} onChange={setSex} />
      <ToolField label="Bodyweight" value={bodyweight} onChange={setBodyweight} suffix="lb" />
      <ToolField label="Total lifted (squat + bench + deadlift)" value={total} onChange={setTotal} suffix="lb" />
      {result && (
        <View className="gap-2">
          <ToolResult label="Wilks score" value={`${result.wilks}`} />
          <ToolResult label="DOTS score" value={`${result.dots}`} />
        </View>
      )}
    </View>
  );
}

export const TOOL_COMPONENTS: Record<string, () => ReactElement> = {
  tdee: TdeeCalculator,
  macros: MacroCalculator,
  protein: ProteinCalculator,
  'one-rep-max': OneRepMaxCalculator,
  'body-fat': BodyFatCalculator,
  plates: PlateCalculator,
  water: WaterIntakeCalculator,
  'strength-score': StrengthScoreCalculator,
};
