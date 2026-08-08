import { Switch as RNSwitch } from 'react-native';

export default function Switch({
  value,
  onValueChange,
  disabled = false,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: '#374151', true: '#4ADE80' }}
      thumbColor="#F9FAFB"
    />
  );
}
