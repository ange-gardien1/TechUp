import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from '../ThemedNative';
import { FileText, X } from 'lucide-react-native';

export type AdminRequest = {
  id: number;
  customer: string;
  customerPhone: string | null;
  deviceType: string;
  brand: string | null;
  model: string | null;
  issue: string;
  serviceAddress: string | null;
  preferredTime: string | null;
  status: string;
  paymentStatus: string;
  technicianId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  amount: number;
  quoteAmount: number | null;
};

export type AdminTechnician = {
  id: number;
  fullName: string;
  email: string;
};

export type AdminQuoteDraft = {
  summary: string;
  diagnosis: string;
  quantity: string;
  laborCost: string;
  partsCost: string;
  notes: string;
};

type Props = {
  request: AdminRequest | null;
  technicians: AdminTechnician[];
  actionMessage: string | null;
  onClose: () => void;
  onReview: (requestId: number) => Promise<void>;
  onReject: (requestId: number) => Promise<void>;
  onSendQuotation: (requestId: number, technicianId: number, draft: AdminQuoteDraft) => Promise<void>;
};

const fieldClassName = 'mt-2 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-slate-100';

export default function AdminRequestDetailsModal({
  request,
  technicians,
  actionMessage,
  onClose,
  onReview,
  onReject,
  onSendQuotation,
}: Props) {
  const [quoteEditorOpen, setQuoteEditorOpen] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [quoteDraft, setQuoteDraft] = useState<AdminQuoteDraft>({
    summary: '',
    diagnosis: 'Device diagnosis: screen and battery fault found during inspection.',
    quantity: '1',
    laborCost: '120',
    partsCost: '80',
    notes: 'Customer approval required before work begins.',
  });

  if (!request) return null;

  const status = request.status.toLowerCase();
  const canReview = status === 'submitted';
  const canReject = status === 'submitted';
  const canQuote = status === 'scheduled' || status === 'customer_approval';
  const selectedTechnician = selectedTechnicianId ?? request.technicianId ?? technicians[0]?.id ?? 0;
  const updateDraft = (patch: Partial<AdminQuoteDraft>) =>
    setQuoteDraft((current) => ({ ...current, ...patch }));

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-4 py-6">
        <View
          className="w-full overflow-hidden rounded-[24px] border border-slate-700 bg-[#0D1B38]"
          style={{ maxWidth: 620, maxHeight: '90%' }}
        >
          <View className="flex-row items-center justify-between border-b border-slate-700 px-5 py-4">
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                Repair request
              </Text>
              <Text className="mt-1 text-lg font-bold text-white">Request #{request.id}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close request details"
              onPress={onClose}
              className="rounded-full border border-slate-600 p-2"
            >
              <X size={18} color="#cbd5e1" />
            </Pressable>
          </View>

          <ScrollView className="flex-shrink" contentContainerStyle={{ padding: 20 }}>
            <View className="rounded-2xl border border-slate-700 bg-[#111827] p-4">
              <View className="flex-row flex-wrap items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-white">
                    {[request.deviceType, request.brand, request.model].filter(Boolean).join(' ')}
                  </Text>
                  <Text className="mt-1 text-sm text-slate-300">{request.customer}</Text>
                </View>
                <View className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5">
                  <Text className="text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-200">
                    {request.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              <Text className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Issue reported
              </Text>
              <Text className="mt-1 text-sm leading-6 text-slate-200">{request.issue}</Text>
            </View>

            <View className="mt-3 flex-row flex-wrap gap-2">
              {[
                ['Customer phone', request.customerPhone],
                ['Service address', request.serviceAddress],
                ['Preferred time', request.preferredTime],
                ['Payment status', request.paymentStatus.replace(/_/g, ' ')],
                ['Assigned technician', request.technicianId ? `#${request.technicianId}` : 'Not assigned'],
                ['Created', request.createdAt ? new Date(request.createdAt).toLocaleString() : 'Not available'],
                ['Updated', request.updatedAt ? new Date(request.updatedAt).toLocaleString() : 'Not available'],
                ['Completed', request.completedAt ? new Date(request.completedAt).toLocaleString() : 'Not completed'],
                ['Service fee', `${request.amount.toLocaleString()} RWF`],
                ['Quote amount', request.quoteAmount === null ? 'Not quoted' : `${request.quoteAmount.toLocaleString()} RWF`],
              ].map(([label, value]) => (
                <View key={label} className="min-w-[46%] flex-1 rounded-xl bg-[#111827] p-3">
                  <Text className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</Text>
                  <Text className="mt-1 text-sm text-slate-100">{value || 'Not provided'}</Text>
                </View>
              ))}
            </View>

            {actionMessage ? (
              <Text accessibilityRole="alert" className="mt-3 rounded-xl border border-cyan-900 bg-cyan-950/50 p-3 text-sm text-cyan-100">
                {actionMessage}
              </Text>
            ) : null}

            {canReview || canReject || canQuote ? (
              <View className="mt-4 gap-2">
                {canReview ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void onReview(request.id)}
                    className="flex-row items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3"
                  >
                    <Text className="text-sm font-bold text-white">Send to manager review</Text>
                  </Pressable>
                ) : null}

                {canReject ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void onReject(request.id)}
                    className="flex-row items-center justify-center gap-2 rounded-xl border border-rose-500/60 bg-rose-500/10 px-4 py-3"
                  >
                    <Text className="text-sm font-bold text-rose-200">Reject incomplete request</Text>
                  </Pressable>
                ) : null}

                {canQuote && !quoteEditorOpen ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setQuoteDraft((current) => ({
                        ...current,
                        summary: current.summary || `${request.deviceType} service check and repair`,
                      }));
                      setQuoteEditorOpen(true);
                    }}
                    className="flex-row items-center justify-center gap-2 rounded-xl border border-sky-500/60 bg-sky-500/10 px-4 py-3"
                  >
                    <FileText size={15} color="#7dd3fc" />
                    <Text className="text-sm font-bold text-sky-200">Prepare quotation</Text>
                  </Pressable>
                ) : null}

                {canQuote && quoteEditorOpen ? (
                  <View className="rounded-2xl border border-sky-500/50 bg-sky-500/5 p-4">
                    <Text className="text-sm font-bold text-sky-200">Quotation</Text>
                    <TextInput
                      value={quoteDraft.summary}
                      onChangeText={(value) => updateDraft({ summary: value })}
                      placeholder="Service summary"
                      placeholderTextColor="#94a3b8"
                      className={fieldClassName}
                    />
                    <TextInput
                      value={quoteDraft.diagnosis}
                      onChangeText={(value) => updateDraft({ diagnosis: value })}
                      placeholder="Diagnosis"
                      placeholderTextColor="#94a3b8"
                      className={fieldClassName}
                    />
                    <View className="mt-2 flex-row gap-2">
                      <TextInput
                        value={quoteDraft.quantity}
                        onChangeText={(value) => updateDraft({ quantity: value })}
                        keyboardType="numeric"
                        placeholder="Qty"
                        placeholderTextColor="#94a3b8"
                        className="w-[20%] rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-slate-100"
                      />
                      <TextInput
                        value={quoteDraft.laborCost}
                        onChangeText={(value) => updateDraft({ laborCost: value })}
                        keyboardType="numeric"
                        placeholder="Labor RWF"
                        placeholderTextColor="#94a3b8"
                        className="flex-1 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-slate-100"
                      />
                      <TextInput
                        value={quoteDraft.partsCost}
                        onChangeText={(value) => updateDraft({ partsCost: value })}
                        keyboardType="numeric"
                        placeholder="Parts RWF"
                        placeholderTextColor="#94a3b8"
                        className="flex-1 rounded-xl border border-slate-700 bg-[#0f172a] px-3 py-2 text-sm text-slate-100"
                      />
                    </View>
                    <Text className="mt-2 text-xs font-semibold text-emerald-200">
                      Total due: {(Number(quoteDraft.laborCost || 0) + Number(quoteDraft.partsCost || 0)).toLocaleString()} RWF
                    </Text>
                    <TextInput
                      value={quoteDraft.notes}
                      onChangeText={(value) => updateDraft({ notes: value })}
                      multiline
                      placeholder="Short quote note"
                      placeholderTextColor="#94a3b8"
                      className={`${fieldClassName} min-h-[70px]`}
                    />

                    {technicians.length ? (
                      <View className="mt-3">
                        <Text className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
                          Technician
                        </Text>
                        <View className="mt-2 flex-row flex-wrap gap-2">
                          {technicians.map((technician) => {
                            const isSelected = selectedTechnician === technician.id;
                            return (
                              <Pressable
                                key={technician.id}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                onPress={() => setSelectedTechnicianId(technician.id)}
                                className={`rounded-full border px-3 py-1.5 ${isSelected ? 'border-emerald-400 bg-emerald-500/15' : 'border-slate-600 bg-[#0f172a]'}`}
                              >
                                <Text className={`text-xs font-semibold ${isSelected ? 'text-emerald-200' : 'text-slate-300'}`}>
                                  {technician.fullName}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ) : (
                      <Text className="mt-3 text-xs text-amber-200">No technicians are available to attach to this quotation.</Text>
                    )}

                    <Pressable
                      accessibilityRole="button"
                      disabled={!selectedTechnician}
                      onPress={() => void onSendQuotation(request.id, selectedTechnician, quoteDraft)}
                      className="mt-4 rounded-xl bg-sky-600 px-4 py-3"
                      style={{ opacity: selectedTechnician ? 1 : 0.5 }}
                    >
                      <Text className="text-center text-sm font-bold text-white">Send quotation</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text className="mt-4 rounded-xl border border-slate-700 bg-[#111827] p-3 text-sm text-slate-300">
                {['under_review', 'schedule_rejected', 'technician_assigned', 'assigned', 'scheduled', 'repair_in_progress', 'in_progress', 'customer_approval'].includes(status)
                  ? 'Assignment and approval actions are handled from the manager dashboard.'
                  : 'No further admin action is available for this request.'}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
