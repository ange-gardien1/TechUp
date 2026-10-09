import { useMemo, useState } from 'react';
import { Pressable, Text, View } from './ThemedNative';

const TIME_SLOTS = ['09:00', '11:00', '13:00', '15:00', '17:00'];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseSchedule(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
  return match ? { date: match[1], time: match[2] } : null;
}

export function formatScheduleTime(value: string | null | undefined) {
  if (!value) return 'To be scheduled';
  const parsed = parseSchedule(value);
  if (!parsed) return value;
  const [year, month, day] = parsed.date.split('-').map(Number);
  const [hour, minute] = parsed.time.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

type SchedulePickerProps = {
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
};

export function SchedulePicker({ value, onChange, optional = false }: SchedulePickerProps) {
  const dates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, offset) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + offset);
        return {
          key: toDateKey(date),
          weekday: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'short' }),
          day: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        };
      }),
    [],
  );
  const parsed = parseSchedule(value);
  const [selectedDate, setSelectedDate] = useState(parsed?.date ?? '');
  const [selectedTime, setSelectedTime] = useState(parsed?.time ?? '');
  const selectedDateIsToday = selectedDate === toDateKey(new Date());

  function chooseDate(date: string) {
    setSelectedDate(date);
    if (selectedTime && (!isTimeAvailable(date, selectedTime))) {
      setSelectedTime('');
      onChange('');
    } else if (selectedTime) {
      onChange(`${date}T${selectedTime}`);
    }
  }

  function chooseTime(time: string) {
    setSelectedTime(time);
    if (selectedDate) onChange(`${selectedDate}T${time}`);
  }

  function clearSelection() {
    setSelectedDate('');
    setSelectedTime('');
    onChange('');
  }

  function isTimeAvailable(date: string, time: string) {
    if (date !== toDateKey(new Date())) return true;
    const [hour, minute] = time.split(':').map(Number);
    const slot = new Date();
    slot.setHours(hour, minute, 0, 0);
    return slot.getTime() > Date.now();
  }

  return (
    <View className="rounded-2xl border border-slate-700 bg-[#0b1220] p-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">Choose a service time</Text>
          <Text className="mt-1 text-xs text-slate-400">Select a day and an available appointment time.</Text>
        </View>
        {optional && value ? (
          <Pressable accessibilityRole="button" onPress={clearSelection} className="rounded-full px-2 py-1">
            <Text className="text-xs font-semibold text-slate-400">Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {dates.map((date) => {
          const selected = selectedDate === date.key;
          return (
            <Pressable
              key={date.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => chooseDate(date.key)}
              className={`min-w-[29%] flex-1 rounded-xl border px-2 py-2 ${
                selected ? 'border-cyan-400 bg-cyan-400/15' : 'border-slate-700 bg-slate-900'
              }`}
            >
              <Text className={`text-center text-xs font-bold ${selected ? 'text-cyan-100' : 'text-slate-200'}`}>{date.weekday}</Text>
              <Text className={`mt-0.5 text-center text-[10px] ${selected ? 'text-cyan-200' : 'text-slate-500'}`}>{date.day}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Appointment time</Text>
      <View className="flex-row flex-wrap gap-2">
        {TIME_SLOTS.map((time) => {
          const selected = selectedTime === time;
          const disabled = selectedDateIsToday && !isTimeAvailable(selectedDate, time);
          const [hour, minute] = time.split(':').map(Number);
          const label = new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          });
          return (
            <Pressable
              key={time}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => chooseTime(time)}
              className={`rounded-full border px-3 py-2 ${
                disabled
                  ? 'border-slate-800 bg-slate-950'
                  : selected
                    ? 'border-emerald-400 bg-emerald-400/15'
                    : 'border-slate-700 bg-slate-900'
              }`}
            >
              <Text className={`text-xs font-semibold ${disabled ? 'text-slate-700' : selected ? 'text-emerald-200' : 'text-slate-300'}`}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
        <Text className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-200">Selected time</Text>
        <Text className="mt-1 text-sm font-bold text-white">{value ? formatScheduleTime(value) : 'Choose a day and time'}</Text>
      </View>
    </View>
  );
}
