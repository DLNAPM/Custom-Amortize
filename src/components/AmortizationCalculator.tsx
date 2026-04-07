import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { calculateAmortization, AmortizationInput } from '../lib/amortization';
import { Calculator, Save, DollarSign, Calendar, Percent, Plus, Trash2, X, Undo2, Download, FileText, Printer, Sparkles, Wand2, Loader2, Copy } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseSmartPayments } from '../services/geminiService';

interface AmortizationCalculatorProps {
  key?: string;
  initialData?: Partial<AmortizationInput>;
  onSave?: (data: AmortizationInput) => void;
  onUpdate?: (data: AmortizationInput) => void;
  canUpdate?: boolean;
  isGuest?: boolean;
  userTier?: string;
  exportCount?: number;
  printCount?: number;
  onExport?: () => void;
  onPrint?: () => void;
}

export default function AmortizationCalculator({ 
  initialData, 
  onSave, 
  onUpdate, 
  canUpdate, 
  isGuest, 
  userTier = 'Basic',
  exportCount = 0,
  printCount = 0,
  onExport,
  onPrint
}: AmortizationCalculatorProps) {
  const [loanAmount, setLoanAmount] = useState<number>(initialData?.loanAmount || 300000);
  const [downPaymentType, setDownPaymentType] = useState<'value' | 'percent'>('percent');
  const [downPaymentValue, setDownPaymentValue] = useState<number>(20);
  const [annualInterestRate, setAnnualInterestRate] = useState<number>(initialData?.annualInterestRate || 5.5);
  const [loanTermYears, setLoanTermYears] = useState<number>(initialData?.loanTermYears || 30);
  const [paymentsPerYear, setPaymentsPerYear] = useState<number>(initialData?.paymentsPerYear || 12);
  const [balloonPaymentYears, setBalloonPaymentYears] = useState<number | ''>(initialData?.balloonPaymentYears || '');
  const [monthlyExtraPayment, setMonthlyExtraPayment] = useState<number>(initialData?.monthlyExtraPayment || 0);
  const [extraPayments, setExtraPayments] = useState<Record<string, any>>(initialData?.extraPayments || {});
  const [startDate, setStartDate] = useState<string>(() => {
    try {
      if (initialData?.startDate && !isNaN(initialData.startDate.getTime())) {
        return format(initialData.startDate, 'yyyy-MM-dd');
      }
    } catch (e) {}
    return format(new Date(), 'yyyy-MM-dd');
  });
  
  // For the extra payment input UI
  const [extraPaymentPeriod, setExtraPaymentPeriod] = useState<number>(1);
  const [extraPaymentEndPeriod, setExtraPaymentEndPeriod] = useState<number | ''>('');
  const [extraPaymentAmount, setExtraPaymentAmount] = useState<number>(100);

  // Context Menu & Quick Add Modal State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, period: number } | null>(null);
  const [quickAddModal, setQuickAddModal] = useState<{ startPeriod: number } | null>(null);
  const [quickAddCount, setQuickAddCount] = useState<number>(1);
  const [quickAddAmount, setQuickAddAmount] = useState<number>(100);
  const [showAllExtraPaymentsModal, setShowAllExtraPaymentsModal] = useState(false);

  const [addExtraType, setAddExtraType] = useState<'period' | 'date'>('period');
  const [extraPaymentDate, setExtraPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const [smartPrompt, setSmartPrompt] = useState("");
  const [isGeneratingSmart, setIsGeneratingSmart] = useState(false);

  const [extraPaymentsHistory, setExtraPaymentsHistory] = useState<Record<string, any>[]>([]);

  const saveHistory = () => {
    setExtraPaymentsHistory(prev => [...prev, extraPayments]);
  };

  const handleUndo = () => {
    setExtraPaymentsHistory(prev => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const previousState = newHistory.pop();
      if (previousState) {
        setExtraPayments(previousState);
      }
      return newHistory;
    });
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, period: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, period });
  };

  const handleQuickAddSubmit = () => {
    if (!quickAddModal || quickAddAmount <= 0 || quickAddCount <= 0) return;
    
    saveHistory();
    setExtraPayments(prev => {
      const next = { ...prev };
      for (let i = 0; i < quickAddCount; i++) {
        const period = quickAddModal.startPeriod + i;
        next[period] = (next[period] || 0) + quickAddAmount;
      }
      return next;
    });
    
    setQuickAddModal(null);
  };

  const actualDownPayment = useMemo(() => {
    if (downPaymentType === 'percent') {
      return loanAmount * (downPaymentValue / 100);
    }
    return downPaymentValue;
  }, [loanAmount, downPaymentType, downPaymentValue]);

  const input: AmortizationInput = useMemo(() => ({
    loanAmount,
    downPayment: actualDownPayment,
    annualInterestRate,
    loanTermYears,
    paymentsPerYear,
    monthlyExtraPayment,
    extraPayments,
    balloonPaymentYears: balloonPaymentYears === '' ? undefined : Number(balloonPaymentYears),
    startDate: (() => {
      if (!startDate) return new Date();
      const d = new Date(startDate + 'T12:00:00');
      return isNaN(d.getTime()) ? new Date() : d;
    })()
  }), [loanAmount, actualDownPayment, annualInterestRate, loanTermYears, paymentsPerYear, monthlyExtraPayment, extraPayments, balloonPaymentYears, startDate]);

  const { schedule, summary } = useMemo(() => calculateAmortization(input), [input]);

  const handleAddExtraPayment = () => {
    if (extraPaymentAmount <= 0) return;
    
    saveHistory();
    
    if (addExtraType === 'date') {
      if (!extraPaymentDate) return;
      setExtraPayments(prev => ({
        ...prev,
        [`date_${Date.now()}`]: { amount: extraPaymentAmount, date: extraPaymentDate }
      }));
    } else {
      if (extraPaymentPeriod > 0) {
        const end = extraPaymentEndPeriod === '' ? extraPaymentPeriod : Number(extraPaymentEndPeriod);
        const start = Math.min(extraPaymentPeriod, end);
        const finalEnd = Math.max(extraPaymentPeriod, end);
        
        setExtraPayments(prev => {
          const next = { ...prev };
          for (let i = start; i <= finalEnd; i++) {
            const existing = next[i];
            const existingAmount = typeof existing === 'number' ? existing : (existing?.amount || 0);
            next[i] = existingAmount + extraPaymentAmount;
          }
          return next;
        });
        
        // Reset after adding
        setExtraPaymentEndPeriod('');
      }
    }
  };

  const handleSmartPayments = async () => {
    if (userTier !== 'Premium') {
      alert("Smart Payments is a Premium feature. Please upgrade your account to use it.");
      return;
    }
    if (!smartPrompt.trim()) return;
    setIsGeneratingSmart(true);
    try {
      const payments = await parseSmartPayments(smartPrompt, {
        startDate,
        loanAmount,
        paymentsPerYear
      });
      
      if (payments && payments.length > 0) {
        saveHistory();
        setExtraPayments(prev => {
          const next = { ...prev };
          payments.forEach((p, idx) => {
            next[`smart_${Date.now()}_${idx}`] = { amount: p.amount, date: p.date };
          });
          return next;
        });
        setSmartPrompt(""); // clear on success
      } else {
        alert("Could not parse smart payments from your request. Please try rephrasing.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while generating smart payments.");
    } finally {
      setIsGeneratingSmart(false);
    }
  };

  const handleRemoveExtraPayment = (key: string) => {
    saveHistory();
    setExtraPayments(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const checkExportLimit = () => {
    if (userTier === 'Premium') return true;
    if (exportCount >= 3) {
      alert('You have reached the limit of 3 exports for the Basic tier. Please upgrade to Premium to export more.');
      return false;
    }
    return true;
  };

  const checkPrintLimit = () => {
    if (userTier === 'Premium') return true;
    if (printCount >= 3) {
      alert('You have reached the limit of 3 prints for the Basic tier. Please upgrade to Premium to print more.');
      return false;
    }
    return true;
  };

  const exportCSV = () => {
    if (!checkExportLimit()) return;
    const headers = ['Period', 'Date', 'Scheduled Payment', 'Extra Payment', 'Total Payment', 'Principal', 'Interest', 'Balance'];
    const rows = schedule.map(row => [
      row.period,
      !isNaN(row.date.getTime()) ? format(row.date, 'MMM yyyy') : 'Invalid Date',
      row.scheduledPayment.toFixed(2),
      row.extraPayment.toFixed(2),
      row.totalPayment.toFixed(2),
      row.principal.toFixed(2),
      row.interest.toFixed(2),
      row.balance.toFixed(2)
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'amortization_report.csv';
    link.click();
    if (onExport) onExport();
  };

  const exportPDF = () => {
    if (!checkExportLimit()) return;
    const doc = new jsPDF();
    doc.text("Amortization Report", 14, 15);
    autoTable(doc, {
      head: [['Period', 'Date', 'Scheduled Payment', 'Extra Payment', 'Total Payment', 'Principal', 'Interest', 'Balance']],
      body: schedule.map(row => [
        row.period.toString(),
        !isNaN(row.date.getTime()) ? format(row.date, 'MMM yyyy') : 'Invalid Date',
        formatCurrency(row.scheduledPayment),
        formatCurrency(row.extraPayment),
        formatCurrency(row.totalPayment),
        formatCurrency(row.principal),
        formatCurrency(row.interest),
        formatCurrency(row.balance)
      ]),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save('amortization_report.pdf');
    if (onExport) onExport();
  };

  const handlePrint = () => {
    if (!checkPrintLimit()) return;
    const printContent = document.getElementById('amortization-table-container');
    if (!printContent) return;
    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    if (!windowPrint) return;
    windowPrint.document.write(`
      <html>
        <head>
          <title>Print Amortization Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
            th:first-child, td:first-child { text-align: left; }
            th:nth-child(2), td:nth-child(2) { text-align: left; }
            .bg-blue-50 { background-color: #eff6ff; }
            .text-green-600 { color: #16a34a; }
            .text-gray-400 { color: #9ca3af; }
          </style>
        </head>
        <body>
          <h2>Amortization Report</h2>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
      if (onPrint) onPrint();
    }, 250);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-8">
      {/* Inputs Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          Loan Details
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Original Loan Amount</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Down Payment</label>
            <div className="flex rounded-lg shadow-sm">
              <select
                value={downPaymentType}
                onChange={(e) => setDownPaymentType(e.target.value as 'value' | 'percent')}
                className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="percent">%</option>
                <option value="value">$</option>
              </select>
              <input
                type="number"
                value={downPaymentValue}
                onChange={(e) => setDownPaymentValue(Number(e.target.value))}
                className="flex-1 block w-full min-w-0 rounded-none rounded-r-lg sm:text-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Actual: {formatCurrency(actualDownPayment)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Annual Interest Rate</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Percent className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                step="0.1"
                value={annualInterestRate}
                onChange={(e) => setAnnualInterestRate(Number(e.target.value))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loan Term (Years)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                value={loanTermYears}
                onChange={(e) => setLoanTermYears(Number(e.target.value))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payments Per Year</label>
            <select
              value={paymentsPerYear}
              onChange={(e) => setPaymentsPerYear(Number(e.target.value))}
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value={12}>12 (Monthly)</option>
              <option value={26}>26 (Bi-weekly)</option>
              <option value={52}>52 (Weekly)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Extra Monthly Principal Payment</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                min={0}
                value={monthlyExtraPayment}
                onChange={(e) => setMonthlyExtraPayment(Number(e.target.value))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Balloon Payment (in Years)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                min={1}
                max={loanTermYears}
                value={balloonPaymentYears}
                onChange={(e) => setBalloonPaymentYears(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Optional"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {(onSave || onUpdate) && !isGuest && (
          <div className="mt-6 flex justify-end gap-3">
            {onUpdate && canUpdate && (
              <button
                onClick={() => onUpdate(input)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
              >
                <Save className="w-4 h-4" />
                Update Schedule
              </button>
            )}
            {onSave && (
              <button
                onClick={() => onSave(input)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                <Copy className="w-4 h-4" />
                Save as New
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-6">Loan Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Scheduled Payment</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.scheduledPayment)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-green-300">{formatCurrency(summary.currentBalance)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Total Interest</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalInterest)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Total Cost</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</p>
          </div>
          {summary.balloonPaymentAmount !== undefined && (
            <div>
              <p className="text-yellow-200 text-sm font-medium mb-1">Balloon Payment Due</p>
              <p className="text-2xl font-bold text-yellow-100">{formatCurrency(summary.balloonPaymentAmount)}</p>
            </div>
          )}
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Total Extra Payments</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalExtraPayments)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Scheduled Payments</p>
            <p className="text-2xl font-bold">{summary.scheduledPaymentsCount}</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Actual Payments</p>
            <p className="text-2xl font-bold">{summary.actualPaymentsCount}</p>
            {summary.actualPaymentsCount < summary.scheduledPaymentsCount && (
              <p className="text-green-300 text-xs mt-1">
                Saved {summary.scheduledPaymentsCount - summary.actualPaymentsCount} payments!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Smart Payments (Premium) */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-sm border border-purple-100 p-6 relative overflow-hidden">
        {userTier !== 'Premium' && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-4 rounded-xl shadow-lg border border-purple-100 max-w-sm">
              <Sparkles className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Premium Feature</h3>
              <p className="text-sm text-gray-600">
                Upgrade to Premium to use AI-powered Smart Payments and automatically schedule your extra payments using natural language.
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-bold text-purple-900">
            Smart Payments 
            <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full ml-2 uppercase tracking-wider font-bold align-middle">Premium</span>
          </h2>
        </div>
        <p className="text-sm text-purple-700 mb-4">
          Describe your future extra payments in plain English, and our AI will automatically schedule them for you. See how they affect your final payoff and balloon payments.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <textarea
            value={smartPrompt}
            onChange={(e) => setSmartPrompt(e.target.value)}
            placeholder="e.g., 'Pay $500 extra every March and September for the next 5 years' or 'Apply my $5000 annual bonus every December'"
            className="flex-1 block w-full p-3 border border-purple-200 rounded-lg focus:ring-purple-500 focus:border-purple-500 sm:text-sm resize-none bg-white"
            rows={2}
          />
          <button
            onClick={handleSmartPayments}
            disabled={isGeneratingSmart || !smartPrompt.trim()}
            className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 sm:w-auto w-full h-fit self-end"
          >
            {isGeneratingSmart ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            Generate
          </button>
        </div>
      </div>

      {/* Extra Payments Manager */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">Add Extra Principal Payment</h2>
          {extraPaymentsHistory.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Undo2 className="w-4 h-4" />
              Undo
            </button>
          )}
        </div>
        <div className="mb-4 flex gap-4 border-b border-gray-200 pb-2">
          <button
            onClick={() => setAddExtraType('period')}
            className={`text-sm font-medium px-2 py-1 border-b-2 transition-colors ${addExtraType === 'period' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            By Period
          </button>
          <button
            onClick={() => setAddExtraType('date')}
            className={`text-sm font-medium px-2 py-1 border-b-2 transition-colors ${addExtraType === 'date' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            By Date
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {addExtraType === 'period' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Period</label>
                <input
                  type="number"
                  min={1}
                  max={summary.scheduledPaymentsCount}
                  value={extraPaymentPeriod}
                  onChange={(e) => setExtraPaymentPeriod(Number(e.target.value))}
                  className="block w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Period (Optional)</label>
                <input
                  type="number"
                  min={extraPaymentPeriod}
                  max={summary.scheduledPaymentsCount}
                  value={extraPaymentEndPeriod}
                  onChange={(e) => setExtraPaymentEndPeriod(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 12"
                  className="block w-36 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={extraPaymentDate}
                onChange={(e) => setExtraPaymentDate(e.target.value)}
                className="block w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Extra Amount</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                min={0}
                value={extraPaymentAmount}
                onChange={(e) => setExtraPaymentAmount(Number(e.target.value))}
                className="block w-32 pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleAddExtraPayment}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm h-[38px]"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {Object.keys(extraPayments).length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Extra Payments</h3>
            <div className="flex flex-wrap gap-2 items-center">
              {Object.entries(extraPayments).slice(0, 2).map(([key, val]) => {
                const isDateBased = typeof val === 'object' && val !== null && 'date' in val;
                const amount = isDateBased ? (val as any).amount : val;
                const label = isDateBased ? `Date: ${format(new Date((val as any).date), 'MMM d, yyyy')}` : `Period ${key}`;
                
                return (
                  <div key={key} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm border border-blue-100">
                    <span className="font-medium">{label}:</span>
                    <span>{formatCurrency(amount as number)}</span>
                    <button
                      onClick={() => handleRemoveExtraPayment(key)}
                      className="ml-1 text-blue-400 hover:text-blue-600 focus:outline-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              {Object.keys(extraPayments).length > 2 && (
                <button
                  onClick={() => setShowAllExtraPaymentsModal(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors ml-2 underline"
                >
                  View All {Object.keys(extraPayments).length} Extra Payments
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Amortization Schedule Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">Amortization Report</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Excel (CSV)
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
        <div className="overflow-x-auto" id="amortization-table-container">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Payment</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Extra Payment</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Payment</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedule.map((row, idx) => (
                <tr 
                  key={`${row.period}-${idx}`} 
                  className={`${row.isBalloonPayment ? 'bg-yellow-50/80 border-y-2 border-yellow-200' : row.extraPayment > 0 ? 'bg-blue-50/50' : ''} hover:bg-gray-50 transition-colors ${typeof row.period === 'number' ? 'cursor-context-menu' : ''}`}
                  onContextMenu={(e) => typeof row.period === 'number' ? handleContextMenu(e, row.period) : undefined}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.period}
                    {row.isBalloonPayment && <span className="ml-2 text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">Balloon</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{!isNaN(row.date.getTime()) ? format(row.date, 'MMM yyyy') : 'Invalid Date'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.scheduledPayment)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {row.extraPayment > 0 ? (
                      <span className="text-green-600 font-medium">+{formatCurrency(row.extraPayment)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{formatCurrency(row.totalPayment)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.principal)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(row.interest)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{formatCurrency(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-white border border-gray-200 shadow-xl rounded-lg py-1 z-50 min-w-[240px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={contextMenu.period <= 1}
            onClick={() => {
              setQuickAddModal({ startPeriod: contextMenu.period - 1 });
              setQuickAddCount(1);
            }}
          >
            Add Extra Payment Before (Period {contextMenu.period - 1})
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => {
              setQuickAddModal({ startPeriod: contextMenu.period + 1 });
              setQuickAddCount(1);
            }}
          >
            Add Extra Payment After (Period {contextMenu.period + 1})
          </button>
        </div>
      )}

      {/* Quick Add Modal */}
      {quickAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Extra Payments</h3>
              <button onClick={() => setQuickAddModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Starting Period</label>
                <input 
                  type="number" 
                  disabled 
                  value={quickAddModal.startPeriod} 
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-500 sm:text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Payments</label>
                <input 
                  type="number" 
                  min={1} 
                  value={quickAddCount} 
                  onChange={(e) => setQuickAddCount(Number(e.target.value))} 
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount per Payment</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="number" 
                    min={0} 
                    value={quickAddAmount} 
                    onChange={(e) => setQuickAddAmount(Number(e.target.value))} 
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setQuickAddModal(null)} 
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleQuickAddSubmit} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Add Payments
              </button>
            </div>
          </div>
        </div>
      )}
      {/* All Extra Payments Modal */}
      {showAllExtraPaymentsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">All Extra Payments</h3>
              <button onClick={() => setShowAllExtraPaymentsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {Object.keys(extraPayments).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No extra payments added yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(extraPayments).map(([key, val]) => {
                    const isDateBased = typeof val === 'object' && val !== null && 'date' in val;
                    const amount = isDateBased ? (val as any).amount : val;
                    const label = isDateBased ? `Date: ${format(new Date((val as any).date), 'MMM d, yyyy')}` : `Period ${key}`;
                    
                    return (
                      <div key={key} className="flex items-center justify-between bg-blue-50 text-blue-700 px-4 py-3 rounded-xl border border-blue-100">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">{label}</span>
                          <span className="font-bold text-lg">{formatCurrency(amount as number)}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveExtraPayment(key)}
                          className="p-2 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
                          title="Remove payment"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
              <button 
                onClick={() => setShowAllExtraPaymentsModal(false)} 
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
