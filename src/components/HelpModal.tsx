import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export default function HelpModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors z-40"
        aria-label="Help"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                About Custom Amortize
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 text-gray-600">
              <section>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                <p>
                  Custom Amortize is a powerful financial tool designed to help you visualize and manage your loan payoff schedule. It allows you to calculate standard amortization schedules and see the exact impact of making extra payments on your loan balance and interest paid.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-medium text-gray-900 mb-2">How to Use</h3>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li><strong>Enter Loan Details:</strong> Input your loan amount, interest rate, loan term, and start date.</li>
                  <li><strong>Add Extra Payments:</strong> Specify a recurring monthly extra payment or add one-time extra payments on specific dates.</li>
                  <li><strong>Review Schedule:</strong> Check the generated amortization table and charts to see how your balance decreases over time.</li>
                  <li><strong>Save & Share:</strong> Save your schedules to your account and share them with others if needed.</li>
                </ol>
              </section>

              <section>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Intended Audience</h3>
                <p>
                  This application is intended for individuals, homeowners, and financial planners who want to understand the mechanics of their loans and explore strategies for paying off debt faster by making additional principal payments.
                </p>
              </section>

              <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="text-lg font-medium text-amber-900 mb-2">Disclaimer</h3>
                <p className="text-amber-800 text-sm leading-relaxed">
                  <strong>Sensitive Use & Limitations:</strong> The calculations provided by this application are estimates for educational and informational purposes only. This app is <strong>NOT</strong> intended to replace professional financial advice, nor does it guarantee exact payoff dates or amounts, as actual lender calculations (including daily interest accrual, fees, and escrow) may vary. Do not use this tool as the sole basis for major financial decisions. Always consult with your lender or a certified financial advisor for precise figures regarding your specific loan.
                </p>
              </section>
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end rounded-b-2xl">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
