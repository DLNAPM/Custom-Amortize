export interface AmortizationRow {
  period: number | string;
  date: Date;
  scheduledPayment: number;
  extraPayment: number;
  totalPayment: number;
  principal: number;
  interest: number;
  balance: number;
  isBalloonPayment?: boolean;
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
  extraPayments: Record<string, any>; // period -> amount OR id -> { amount, date }
  balloonPaymentYears?: number;
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
    balloonPaymentYears,
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

  const periodExtraPayments: Record<number, number> = {};
  const midPeriodPayments: { date: Date, amount: number, id: string }[] = [];

  for (const [key, val] of Object.entries(extraPayments)) {
    if (typeof val === 'number') {
      if (!isNaN(Number(key))) {
        periodExtraPayments[Number(key)] = val;
      }
    } else if (val && typeof val === 'object') {
      if (val.date) {
        midPeriodPayments.push({ date: new Date(val.date), amount: val.amount, id: key });
      } else if (!isNaN(Number(key))) {
        periodExtraPayments[Number(key)] = val.amount;
      }
    }
  }

  interface PaymentEvent {
    type: 'regular' | 'extra';
    date: Date;
    period?: number;
    amount?: number;
    id?: string;
  }

  const events: PaymentEvent[] = [];

  for (let period = 1; period <= n; period++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + ((period - 1) * (12 / paymentsPerYear)));
    events.push({ type: 'regular', date, period });
  }

  for (const mp of midPeriodPayments) {
    events.push({ type: 'extra', date: mp.date, amount: mp.amount, id: mp.id });
  }

  // Sort events by date. If dates are equal, regular payments come first.
  events.sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    if (diff !== 0) return diff;
    if (a.type === 'regular' && b.type === 'extra') return -1;
    if (a.type === 'extra' && b.type === 'regular') return 1;
    return 0;
  });

  let lastRegularPeriod = 0;
  let subPeriodCounter = 1;

  for (const event of events) {
    if (balance <= 0) break;

    if (event.type === 'regular') {
      const period = event.period!;
      lastRegularPeriod = period;
      subPeriodCounter = 1;

      const interest = balance * r;
      let extraPayment = (periodExtraPayments[period] || 0) + monthlyExtraPayment;
      
      // If scheduled payment + extra payment > balance + interest, adjust
      let currentScheduledPayment = scheduledPayment;
      if (balance + interest < currentScheduledPayment) {
        currentScheduledPayment = balance + interest;
        extraPayment = 0; // No need for extra payment if scheduled covers it
      } else if (balance + interest < currentScheduledPayment + extraPayment) {
        extraPayment = (balance + interest) - currentScheduledPayment;
      }

      let isBalloonPayment = false;
      if (balloonPaymentYears && period === balloonPaymentYears * paymentsPerYear) {
        isBalloonPayment = true;
        extraPayment = (balance + interest) - currentScheduledPayment;
      }

      const totalPayment = currentScheduledPayment + extraPayment;
      const principalPayment = totalPayment - interest;
      
      balance -= principalPayment;
      if (balance < 0.01) balance = 0; // Handle floating point issues

      totalInterest += interest;
      totalExtraPayments += extraPayment;
      actualPaymentsCount++;

      schedule.push({
        period,
        date: event.date,
        scheduledPayment: currentScheduledPayment,
        extraPayment,
        totalPayment,
        principal: principalPayment,
        interest,
        balance,
        isBalloonPayment
      });
    } else if (event.type === 'extra') {
      const appliedExtra = Math.min(balance, event.amount!);
      balance -= appliedExtra;
      if (balance < 0.01) balance = 0;
      totalExtraPayments += appliedExtra;

      schedule.push({
        period: lastRegularPeriod === 0 ? `0.${subPeriodCounter}` : `${lastRegularPeriod}.${subPeriodCounter}`,
        date: event.date,
        scheduledPayment: 0,
        extraPayment: appliedExtra,
        totalPayment: appliedExtra,
        principal: appliedExtra,
        interest: 0,
        balance
      });
      subPeriodCounter++;
    }
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
