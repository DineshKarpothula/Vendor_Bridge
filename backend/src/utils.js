import crypto from 'crypto';

export function createDocumentNumber(prefix) {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateLineItemTotals(item) {
  const quantity = toNumber(item.quantity);
  const unitPrice = toNumber(item.unitPrice);
  const taxRate = toNumber(item.taxRate);
  const lineTotal = Number((quantity * unitPrice).toFixed(2));
  const taxAmount = Number(((lineTotal * taxRate) / 100).toFixed(2));

  return {
    quantity,
    unitPrice,
    taxRate,
    lineTotal,
    taxAmount,
    grandTotal: Number((lineTotal + taxAmount).toFixed(2))
  };
}

export function calculateDocumentTotals(items = [], cgstRate = 9, sgstRate = 9) {
  const subtotal = Number(
    items.reduce((sum, item) => sum + toNumber(item.lineTotal, toNumber(item.quantity) * toNumber(item.unitPrice)), 0).toFixed(2)
  );
  const cgstAmount = Number(((subtotal * toNumber(cgstRate)) / 100).toFixed(2));
  const sgstAmount = Number(((subtotal * toNumber(sgstRate)) / 100).toFixed(2));
  const grandTotal = Number((subtotal + cgstAmount + sgstAmount).toFixed(2));

  return { subtotal, cgstAmount, sgstAmount, grandTotal };
}

export function calculateQuotationTotals(items = []) {
  const subtotal = Number(items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0).toFixed(2));
  const taxAmount = Number(items.reduce((sum, item) => sum + toNumber(item.taxAmount), 0).toFixed(2));
  const grandTotal = Number(items.reduce((sum, item) => sum + toNumber(item.grandTotal), 0).toFixed(2));

  return { subtotal, taxAmount, grandTotal };
}

export function publicUser(user, vendorId = null) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    vendorId
  };
}
