import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from './ThemedNative';

export type QuoteForm = {
  diagnosis: string;
  partName: string;
  partCondition: 'new' | 'second_hand';
  partCost: string;
  laborCost: string;
};

type QuoteComposerModalProps = {
  visible: boolean;
  requestId: number;
  device: string;
  customer: string;
  diagnosisNote: string | null;
  onClose: () => void;
  onSubmit: (form: QuoteForm) => Promise<void>;
};

const emptyQuote: QuoteForm = {
  diagnosis: '',
  partName: '',
  partCondition: 'new',
  partCost: '0',
  laborCost: '',
};

export function QuoteComposerModal({
  visible,
  requestId,
  device,
  customer,
  diagnosisNote,
  onClose,
  onSubmit,
}: QuoteComposerModalProps) {
  const [form, setForm] = useState<QuoteForm>(emptyQuote);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const partCost = form.partName.trim() ? Number(form.partCost) || 0 : 0;
  const laborCost = Number(form.laborCost) || 0;

  useEffect(() => {
    if (visible) {
      setForm({ ...emptyQuote, diagnosis: diagnosisNote ?? '' });
      setError(null);
    }
  }, [visible, requestId, diagnosisNote]);

  async function submitQuote() {
    if (!form.diagnosis.trim()) {
      setError('Enter the diagnosis before sending the quotation.');
      return;
    }
    if (!form.laborCost.trim()) {
      setError('Enter the labor cost before sending the quotation.');
      return;
    }
    if (form.partName.trim() && !form.partCost.trim()) {
      setError('Enter the replacement part price.');
      return;
    }
    const parsedPartCost = form.partName.trim() ? Number(form.partCost) : 0;
    const parsedLaborCost = Number(form.laborCost);
    if (!Number.isFinite(parsedPartCost) || parsedPartCost < 0 || !Number.isFinite(parsedLaborCost) || parsedLaborCost < 0) {
      setError('Enter valid non-negative part and labor costs.');
      return;
    }
    if (form.partName.trim() && parsedPartCost <= 0) {
      setError('Enter the replacement part price.');
      return;
    }

    setSending(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        diagnosis: form.diagnosis.trim(),
        partName: form.partName.trim(),
        partCost: String(parsedPartCost),
        laborCost: String(parsedLaborCost),
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to send the quotation.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-4 py-6">
        <View className="w-full overflow-hidden rounded-[28px] border border-slate-700 bg-[#091525]" style={{ maxWidth: 560, maxHeight: '94%' }}>
          <View className="flex-row items-center justify-between border-b border-slate-700 px-5 py-4">
            <View className="flex-1 pr-3">
              <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Quote builder · #{requestId}</Text>
              <Text className="mt-1 text-lg font-black text-white">Prepare quotation</Text>
              <Text className="mt-1 text-xs text-slate-400">{customer} · {device}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close quotation form" onPress={onClose} className="rounded-full border border-slate-600 px-3 py-2">
              <Text className="text-sm font-semibold text-slate-200">Close</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
            <Text className="mb-1 text-xs font-semibold text-slate-200">Diagnosis *</Text>
            <TextInput
              value={form.diagnosis}
              onChangeText={(diagnosis) => setForm((previous) => ({ ...previous, diagnosis }))}
              placeholder="Describe what was diagnosed and the repair needed"
              placeholderTextColor="#64748b"
              multiline
              textAlignVertical="top"
              className="min-h-[92px] rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-3 text-sm text-white"
            />

            <Text className="mb-1 mt-4 text-xs font-semibold text-slate-200">Replacement part (optional)</Text>
            <TextInput
              value={form.partName}
              onChangeText={(partName) => setForm((previous) => ({ ...previous, partName }))}
              placeholder="e.g. Screen replacement"
              placeholderTextColor="#64748b"
              className="min-h-11 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-white"
            />

            {form.partName.trim() ? (
              <>
                <Text className="mb-2 mt-4 text-xs font-semibold text-slate-200">Part condition</Text>
                <View className="flex-row gap-2">
                  {([
                    { label: 'New part', value: 'new' },
                    { label: 'Second-hand', value: 'second_hand' },
                  ] as const).map((option) => {
                    const selected = form.partCondition === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setForm((previous) => ({ ...previous, partCondition: option.value }))}
                        className={`flex-1 rounded-xl border px-3 py-3 ${selected ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-700 bg-[#0f172a]'}`}
                      >
                        <Text className={`text-center text-xs font-semibold ${selected ? 'text-cyan-200' : 'text-slate-300'}`}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text className="mb-1 mt-4 text-xs font-semibold text-slate-200">Part price (RWF) *</Text>
                <TextInput
                  value={form.partCost}
                  onChangeText={(partCostValue) => setForm((previous) => ({ ...previous, partCost: partCostValue }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  className="min-h-11 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-white"
                />
              </>
            ) : (
              <Text className="mt-2 text-xs text-slate-400">No replacement part will be charged.</Text>
            )}

            <Text className="mb-1 mt-4 text-xs font-semibold text-slate-200">Labor (RWF) *</Text>
            <TextInput
              value={form.laborCost}
              onChangeText={(laborCostValue) => setForm((previous) => ({ ...previous, laborCost: laborCostValue }))}
              keyboardType="decimal-pad"
              placeholder="Enter labor cost"
              placeholderTextColor="#64748b"
              className="min-h-11 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-white"
            />

            <View className="mt-4 flex-row items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
              <Text className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-200">Total quotation</Text>
              <Text className="text-lg font-black text-white">RWF {(partCost + laborCost).toLocaleString()}</Text>
            </View>
            <Text className="mt-3 text-xs text-slate-400">TechUp support: 0782245728</Text>

            {error ? <Text accessibilityRole="alert" className="mt-3 text-sm text-rose-300">{error}</Text> : null}

            <Pressable
              disabled={sending}
              onPress={submitQuote}
              className="mt-5 rounded-xl bg-emerald-500 px-4 py-4"
              style={{ opacity: sending ? 0.6 : 1 }}
            >
              <Text className="text-center text-sm font-bold uppercase tracking-[0.12em] text-emerald-950">
                {sending ? 'Sending quotation…' : 'Send quotation to customer'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
