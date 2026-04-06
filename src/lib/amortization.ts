export interface AmortizationRow {
  period: number;
  date: Date;
  scheduledPayment: number;
  extraPayment: number;
  totalPayment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface AmortizationSummary {
  scheduledPayment: number;
  scheduledPaymentsCount: number;
  actualPaymentsCount: number;
  totalExtraPayments: number;
  totalInterest: number;
  payoffDate: Date;
}

export interface AmortizationInput {
  loanAmount: number;
  downPayment: number;
  annualInterestRate: number;
  loanTermYears: number;
  paymentsPerYear: number;
  monthlyExtraPayment: number;
  extraPayments: Record<number, number>; // period -> extra payment amount
  startDate: Date;
}

export function calculateAmortization(input: AmortizationInput): {
  schedule: AmortizationRow[];
  summary: AmortizationSummary;
} {
  const {
    loanAmount,
    downPayment,
    annualInterestRate,
    loanTermYears,
    paymentsPerYear,
    monthlyExtraPayment,
    extraPayments,
    startDate
  } = input;

  const principal = loanAmount - downPayment;
  if (principal <= 0) {
    return {
      schedule: [],
      summary: {
        scheduledPayment: 0,
        scheduledPaymentsCount: 0,
        actualPaymentsCount: 0,
        totalExtraPayments: 0,
        totalInterest: 0,
        payoffDate: startDate
      }
    };
  }

  const r = (annualInterestRate / 100) / paymentsPerYear;
  const n = loanTermYears * paymentsPerYear;
  
  let scheduledPayment = 0;
  if (r === 0) {
    scheduledPayment = principal / n;
  } else {
    scheduledPayment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const schedule: AmortizationRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalExtraPayments = 0;
  let actualPaymentsCount = 0;

  for (let period = 1; period <= n; period++) {
    if (balance <= 0) break;

    const interest = balance * r;
    let extraPayment = (extraPayments[period] || 0) + monthlyExtraPayment;
    
    // If scheduled payment + extra payment > balance + interest, adjust
    let currentScheduledPayment = scheduledPayment;
    if (balance + interest < currentScheduledPayment) {
      currentScheduledPayment = balance + interest;
      extraPayment = 0; // No need for extra payment if scheduled covers it
    } else if (balance + interest < currentScheduledPayment + extraPayment) {
      extraPayment = (balance + interest) - currentScheduledPayment;
    }

    const totalPayment = currentScheduledPayment + extraPayment;
    const principalPayment = totalPayment - interest;
    
    balance -= principalPayment;
    if (balance < 0.01) balance = 0; // Handle floating point issues

    totalInterest += interest;
    totalExtraPayments += extraPayment;
    actualPaymentsCount++;

    const date = new Date(startDate);
    date.setMonth(date.getMonth() + ((period - 1) * (12 / paymentsPerYear)));

    schedule.push({
      period,
      date,
      scheduledPayment: currentScheduledPayment,
      extraPayment,
      totalPayment,
      principal: principalPayment,
      interest,
      balance
    });
  }

  return {
    schedule,
    summary: {
      scheduledPayment,
      scheduledPaymentsCount: n,
      actualPaymentsCount,
      totalExtraPayments,
      totalInterest,
      payoffDate: schedule.length > 0 ? schedule[schedule.length - 1].date : startDate
    }
  };
}
