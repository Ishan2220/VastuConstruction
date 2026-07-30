import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { eventBus } from '../events/EventBus.js';
import { postJournalEntry } from './journal.service.js';
import { normalizePaymentMethod } from '../utils/normalizers.js';

export const createPaymentWithDetails = async (vendorId: string, data: any, userId: string) => {
  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, deletedAt: null } });
  if (!vendor) throw new ApiError(404, 'Vendor not found');

  const { paymentDate, paymentMethod, accountId, reference, notes, details, projectId, gstMode, gstPercentage, gstAmount } = data;

  if (!details || !Array.isArray(details) || details.length === 0) {
    throw new ApiError(400, 'Payment details are required');
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Calculate total amount
    let totalAmount = 0;
    const detailPayloads = details.map((d: any) => {
      const quantity = Number(d.quantity) || 0;
      const rate = Number(d.rate) || 0;
      const amount = quantity * rate;
      totalAmount += amount;
      return {
        categoryId: d.categoryId || null,
        description: d.description,
        quantity,
        rate,
        amount,
      };
    });

    if (totalAmount <= 0) {
      throw new ApiError(400, 'Total payment amount must be greater than zero');
    }

    const cleanedGstMode = gstMode || 'NONE';
    const cleanedGstPercentage = gstPercentage ? Number(gstPercentage) : null;
    const cleanedGstAmount = Number(gstAmount) || 0;
    const finalTotalAmount = totalAmount + cleanedGstAmount;

    // 2. Create Vendor Payment
    const payment = await tx.vendorPayment.create({
      data: {
        vendorId,
        amount: totalAmount,
        gstMode: cleanedGstMode,
        gstPercentage: cleanedGstPercentage,
        gstAmount: cleanedGstAmount,
        totalAmount: finalTotalAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: normalizePaymentMethod(paymentMethod),
        reference,
        notes,
        details: {
          create: detailPayloads
        }
      },
      include: {
        details: true
      }
    });

    // 3. Create Expense
    const expense = await tx.expense.create({
      data: {
        vendorId,
        projectId,
        type: vendor.category === 'LABOUR_CONTRACTOR' ? 'LABOUR' : 'VENDOR',
        amount: totalAmount,
        gstMode: cleanedGstMode,
        gstPercentage: cleanedGstPercentage,
        gstAmount: cleanedGstAmount,
        totalAmount: finalTotalAmount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        accountId: accountId || null,
        description: `Payment to ${vendor.name} (Ref: ${reference || 'N/A'})`,
        remarks: `${notes || ''} | DETAILS:${JSON.stringify(detailPayloads)}`,
        createdById: userId,
      }
    });

    // 4. Create Journal Entry (Double-Entry Ledger with Flexible GST split)
    const lines = [];
    // 1. Bank Account pays the Total Amount (Base + GST)
    lines.push({ accountId, debitAmount: 0, creditAmount: finalTotalAmount, description: 'Bank/Cash Outflow (Total)' });
    // 2. Accounts Payable (Null for now) receives the Base Amount
    lines.push({ accountId: null, debitAmount: totalAmount, creditAmount: 0, description: 'Accounts Payable (Base)' });
    // 3. Tax Account (Null for now) receives the GST Amount if any
    if (cleanedGstAmount > 0) {
      lines.push({ accountId: null, debitAmount: cleanedGstAmount, creditAmount: 0, description: 'GST Paid' });
    }

    const journal = await postJournalEntry({
      entryDate: payment.paymentDate,
      description: `Vendor Payment to ${vendor.name} - ${notes || ''}`,
      referenceId: payment.id,
      referenceType: 'VENDOR_PAYMENT',
      createdById: userId,
      lines
    }, tx);

    return { payment, expense, journal };
  });

  // 5. Emit Events
  eventBus.publishMutation('VendorPayment', 'CREATE', userId, result.payment.id, data.idempotencyKey || crypto.randomUUID(), result.payment, null);
  eventBus.publishMutation('Expense', 'CREATE', userId, result.expense.id, crypto.randomUUID(), result.expense, null);

  return result.payment;
};
