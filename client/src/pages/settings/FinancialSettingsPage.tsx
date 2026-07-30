import { useState, useEffect } from 'react';
import { ArrowLeft, Save, IndianRupee } from 'lucide-react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import api from '@/lib/api';

const financialSettingsSchema = z.object({
  defaultGstMode: z.enum(['NONE', 'PERCENTAGE', 'AMOUNT']),
  defaultGstPercentage: z.number().min(0).max(100),
  allowCustomGstPercentage: z.boolean(),
  allowManualGstAmount: z.boolean(),
  gstMandatory: z.boolean(),
  allowOperatorOverride: z.boolean(),
});

type FinancialSettingsForm = z.infer<typeof financialSettingsSchema>;

export default function FinancialSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty }
  } = useForm<FinancialSettingsForm>({
    resolver: zodResolver(financialSettingsSchema),
    defaultValues: {
      defaultGstMode: 'NONE',
      defaultGstPercentage: 18,
      allowCustomGstPercentage: true,
      allowManualGstAmount: true,
      gstMandatory: false,
      allowOperatorOverride: true
    }
  });

  const defaultGstMode = watch('defaultGstMode');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data?.data?.settings) {
          const s = data.data.settings;
          if (s.defaultGstMode) setValue('defaultGstMode', s.defaultGstMode);
          if (s.defaultGstPercentage !== undefined) setValue('defaultGstPercentage', s.defaultGstPercentage);
          if (s.allowCustomGstPercentage !== undefined) setValue('allowCustomGstPercentage', s.allowCustomGstPercentage);
          if (s.allowManualGstAmount !== undefined) setValue('allowManualGstAmount', s.allowManualGstAmount);
          if (s.gstMandatory !== undefined) setValue('gstMandatory', s.gstMandatory);
          if (s.allowOperatorOverride !== undefined) setValue('allowOperatorOverride', s.allowOperatorOverride);
        }
      } catch (error) {
        toast.error('Failed to load financial settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [setValue]);

  const onSubmit = async (formData: FinancialSettingsForm) => {
    try {
      setSaving(true);
      // Fetch current to merge
      const { data } = await api.get('/settings');
      const currentSettings = data?.data?.settings || {};
      
      const payload = {
        settings: {
          ...currentSettings,
          ...formData,
        }
      };
      
      await api.put('/settings', payload);
      toast.success('Financial settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-800" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto font-sans relative">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
        <Link
          to="/settings"
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-heading flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-emerald-600" />
            Financial & GST Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure global default behaviours for taxes and financial entry.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-800">GST Defaults</h3>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Default GST Mode</label>
                <select
                  {...register('defaultGstMode')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="NONE">No GST</option>
                  <option value="PERCENTAGE">GST Percentage</option>
                  <option value="AMOUNT">Manual GST Amount</option>
                </select>
                {errors.defaultGstMode && <p className="text-xs text-red-500">{errors.defaultGstMode.message}</p>}
              </div>

              {defaultGstMode === 'PERCENTAGE' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Default GST Percentage (%)</label>
                  <select
                    {...register('defaultGstPercentage', { valueAsNumber: true })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                  {errors.defaultGstPercentage && <p className="text-xs text-red-500">{errors.defaultGstPercentage.message}</p>}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <label className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  {...register('gstMandatory')}
                  className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">Make GST Mandatory</div>
                  <div className="text-xs text-slate-500">Require GST details to be filled for every financial transaction.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  {...register('allowOperatorOverride')}
                  className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">Allow Operator Override</div>
                  <div className="text-xs text-slate-500">Allow users to override these defaults on individual transaction forms.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  {...register('allowManualGstAmount')}
                  className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">Allow Manual GST Amount</div>
                  <div className="text-xs text-slate-500">Allow users to manually type the exact GST amount in rupees instead of selecting a percentage.</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={!isDirty || saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 focus:ring-4 focus:ring-slate-200 transition-all font-semibold disabled:opacity-50"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
