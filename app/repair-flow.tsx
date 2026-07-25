import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RepairFlowScreen() {
  const [deviceType, setDeviceType] = useState('Phone');
  const [issue, setIssue] = useState('Battery drains quickly');
  const [serviceFee, setServiceFee] = useState('2000');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null);

  async function submitRequest() {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/repair-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 1,
          deviceType,
          issueDescription: issue,
          serviceAddress: 'Kigali, Rwanda',
          latitude: -1.9441,
          longitude: 30.0619,
          preferredTime: 'Today',
          serviceFee: Number(serviceFee),
        }),
      });
      const data = await response.json();
      setRequestId(data.id);
      setMessage('Repair request created successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create repair request');
    } finally {
      setLoading(false);
    }
  }

  async function assignTechnician() {
    if (!requestId) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/repair-requests/${requestId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: 2, serviceFee: Number(serviceFee) }),
      });
      const data = await response.json();
      setMessage(`Assigned technician: ${data.technicianId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to assign technician');
    } finally {
      setLoading(false);
    }
  }

  async function payServiceFee() {
    if (!requestId) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/repair-requests/${requestId}/pay-service-fee`, { method: 'POST' });
      const data = await response.json();
      setMessage(`Service fee paid. Status: ${data.status}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to pay service fee');
    } finally {
      setLoading(false);
    }
  }

  async function createQuote() {
    if (!requestId) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/repair-requests/${requestId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: 2, laborCost: 12000, sparePartsCost: 5000, notes: 'Screen replacement and battery test' }),
      });
      const data = await response.json();
      setMessage(`Quote created: ${data.quote.amount}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create quote');
    } finally {
      setLoading(false);
    }
  }

  async function approveQuote() {
    if (!requestId) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/repair-requests/${requestId}/approve-quote`, { method: 'POST' });
      const data = await response.json();
      setMessage(`Quote approved. Status: ${data.status}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to approve quote');
    } finally {
      setLoading(false);
    }
  }

  async function completeRepair() {
    if (!requestId) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/repair-requests/${requestId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Repair completed successfully', photoUrl: 'https://example.com/repair.jpg' }),
      });
      const data = await response.json();
      setMessage(`Repair completed. Status: ${data.status}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to complete repair');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0B0B0F]">
      <ScrollView className="flex-1 px-6 py-8" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="rounded-[24px] border border-[#2B2F36] bg-[#14161A] p-6">
          <Text className="text-3xl font-semibold text-white">Repair workflow</Text>
          <Text className="mt-3 text-base text-slate-300">Create a repair request, assign a technician, approve a quote, and complete the job in one guided flow.</Text>
        </View>

        <View className="mt-6 rounded-[24px] border border-[#2B2F36] bg-[#1B1E24] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">Create request</Text>
          <TextInput value={deviceType} onChangeText={setDeviceType} placeholder="Device type" placeholderTextColor="#64748b" className="mt-3 rounded-xl border border-[#2B2F36] bg-[#14161A] px-3 py-3 text-white" />
          <TextInput value={issue} onChangeText={setIssue} placeholder="Issue" placeholderTextColor="#64748b" className="mt-3 rounded-xl border border-[#2B2F36] bg-[#14161A] px-3 py-3 text-white" />
          <TextInput value={serviceFee} onChangeText={setServiceFee} keyboardType="numeric" placeholder="Service fee" placeholderTextColor="#64748b" className="mt-3 rounded-xl border border-[#2B2F36] bg-[#14161A] px-3 py-3 text-white" />

          <Pressable onPress={submitRequest} className="mt-4 rounded-xl bg-cyan-500 px-4 py-3">
            {loading ? <ActivityIndicator color="white" /> : <Text className="text-center font-semibold text-white">Submit repair request</Text>}
          </Pressable>
        </View>

        <View className="mt-6 rounded-[24px] border border-[#2B2F36] bg-[#1B1E24] p-5">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Workflow actions</Text>
          <View className="mt-4 gap-3">
            <Pressable onPress={assignTechnician} className="rounded-xl border border-[#2B2F36] bg-[#14161A] px-4 py-3"><Text className="text-center font-semibold text-emerald-300">Assign technician</Text></Pressable>
            <Pressable onPress={payServiceFee} className="rounded-xl border border-[#2B2F36] bg-[#14161A] px-4 py-3"><Text className="text-center font-semibold text-amber-300">Pay service fee</Text></Pressable>
            <Pressable onPress={createQuote} className="rounded-xl border border-[#2B2F36] bg-[#14161A] px-4 py-3"><Text className="text-center font-semibold text-violet-300">Create quote</Text></Pressable>
            <Pressable onPress={approveQuote} className="rounded-xl border border-[#2B2F36] bg-[#14161A] px-4 py-3"><Text className="text-center font-semibold text-cyan-300">Approve quote</Text></Pressable>
            <Pressable onPress={completeRepair} className="rounded-xl border border-[#2B2F36] bg-[#14161A] px-4 py-3"><Text className="text-center font-semibold text-slate-200">Complete repair</Text></Pressable>
          </View>
        </View>

        {message ? <View className="mt-6 rounded-[20px] border border-[#2B2F36] bg-[#14161A] p-4"><Text className="text-sm text-slate-300">{message}</Text></View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
