import { SMSCreditService } from '../src/services/smsCreditService';
import { executeQuery } from '../src/config/database-hybrid';

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help' || command === '-h') {
        console.log(`
SMS Credit Management Utility
Usage:
  npm run manage-credits <command> [args]

Commands:
  balance               Show current SMS credit balance
  add <amount> [notes]  Add credits to the balance
  reset <amount>        Force reset balance to a specific amount
  history [limit]       Show recent credit transactions
        `);
        return;
    }

    try {
        switch (command) {
            case 'balance': {
                const balance = await SMSCreditService.getBalance();
                if (!balance) {
                    console.error('❌ No balance record found. Has the migration been run?');
                } else {
                    console.log(`
📊 Current SMS Credit Status:
----------------------------
ID:                ${balance.id}
Credits Remaining: ${balance.credits_remaining}
Total Purchased:   ${balance.total_purchased}
Total Used:        ${balance.total_used}
Low Threshold:     ${balance.low_credit_threshold}
Last Updated:      ${balance.updated_at}
                    `);
                }
                break;
            }

            case 'add': {
                const amount = parseInt(args[1], 10);
                const notes = args[2] || 'Manual CLI addition';
                if (isNaN(amount)) {
                    console.error('❌ Please specify a valid amount to add.');
                    return;
                }
                const newBalance = await SMSCreditService.addCredits(amount, notes, 1); // Using system admin ID 1
                console.log(`✅ Added ${amount} credits. New balance: ${newBalance}`);
                break;
            }

            case 'reset': {
                const amount = parseInt(args[1], 10);
                if (isNaN(amount)) {
                    console.error('❌ Please specify a valid amount for reset.');
                    return;
                }
                await executeQuery(
                    'UPDATE sms_credit_balance SET credits_remaining = $1, updated_at = NOW() WHERE id = (SELECT id FROM sms_credit_balance LIMIT 1)',
                    [amount]
                );
                console.log(`⚠️ Balance force-reset to ${amount}`);
                break;
            }

            case 'history': {
                const limit = parseInt(args[1], 10) || 10;
                const { transactions } = await SMSCreditService.getTransactions(1, limit);
                console.log(`
📜 Recent Credit Transactions (Last ${transactions.length}):
------------------------------------------------------`);
                transactions.forEach(t => {
                    const sign = t.transaction_type === 'purchase' ? '+' : (t.transaction_type === 'deduction' ? '-' : '');
                    console.log(`${new Date(t.created_at).toLocaleString()} | ${t.transaction_type.toUpperCase().padEnd(10)} | ${sign}${t.amount.toString().padEnd(6)} | Bal: ${t.balance_after.toString().padEnd(8)} | Ref: ${t.reference || 'N/A'}`);
                });
                break;
            }

            default:
                console.error(`❌ Unknown command: ${command}`);
        }
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    } finally {
        // Since we are using a pool, we might need to exit explicitly if there are no other tasks
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
